/**
 * Smart model router.
 *
 * The router takes a user preference + a task hint and resolves it to a
 * concrete (provider, model) pair the orchestrator can stream from.
 *
 * Decision order (highest priority first):
 *   1. Explicit user pick (providerId + modelId), if both are configured.
 *   2. Offline mode → first available Ollama model (always local).
 *   3. Auto-select for the task type:
 *        a. Prefer free + capable
 *        b. Then local
 *        c. Then paid (only if `allowPaid` and no free/local model exists)
 *   4. Fallback chain on errors: same task best-match, then any free model,
 *      then any local model. The orchestrator calls `nextFallback()` after
 *      a failure to walk the chain.
 *
 * The router never throws when configured providers exist — there is
 * always a chosen model. If literally nothing is configured (no Gemini,
 * no Ollama, no other), the caller is expected to fall back to its
 * deterministic offline stream.
 */

import {
  ALL_PROVIDERS,
  getProvider,
  resolveModel,
} from "./providers/registry";
import type {
  LLMProvider,
  ModelDescriptor,
  ProviderTier,
  ResolvedModel,
  RouteMode,
  TaskKind,
} from "./providers/types";

export type RouteRequest = {
  /** User's task / mode hint. */
  task: TaskKind;
  /** Speed/quality preset: fast | balanced | advanced | reasoning. */
  mode?: RouteMode;
  /** Explicit user pick — bypasses auto-select. */
  preferred?: { providerId: string; modelId: string };
  /** Skip the web entirely — only resolve local providers. */
  offline?: boolean;
  /** Auto-select on (uses smart heuristic instead of preferred). */
  autoSelect?: boolean;
  /** Allow paid providers in the candidate set. */
  allowPaid?: boolean;
};

export type RouteResult = {
  chosen: ResolvedModel;
  /** Reasoning string for the dashboard / debug logs. */
  reason: string;
  /** Pre-computed fallback chain — pop from head as failures occur. */
  fallbacks: ResolvedModel[];
};

/**
 * Does this model suit the requested speed/quality preset? Tagged models
 * (descriptor.modes) answer directly; untagged ones (e.g. dynamic Ollama
 * lists) fall back to a name/capability heuristic.
 */
function matchesMode(model: ModelDescriptor, mode: RouteMode): boolean {
  if (model.modes) return model.modes.includes(mode);
  const id = model.id.toLowerCase();
  switch (mode) {
    case "fast":
      return /flash|instant|mini|haiku|8b|7b|3b|1b/.test(id);
    case "advanced":
      return /pro|opus|70b|405b|gpt-4o$|sonnet/.test(id);
    case "reasoning":
      return !!model.capabilities?.reasoning || /r1|opus|think/.test(id);
    case "balanced":
      return true; // balanced = no constraint
  }
}

/** Numeric ranking; higher is better. */
function scoreModel(
  model: ModelDescriptor,
  task: TaskKind,
  allowPaid: boolean,
  mode?: RouteMode,
): number {
  if (model.tier === "paid" && !allowPaid) return -1;
  let s = 0;
  // Free + local are equally preferred for cost. Local edges slightly
  // higher for the "offline-friendly" USP.
  if (model.tier === "local") s += 100;
  else if (model.tier === "free") s += 90;
  else s += 30; // paid

  // Task preference bonus.
  if (model.preferredFor?.includes(task)) s += 50;
  if (model.capabilities?.code && task === "coding") s += 25;
  if (model.capabilities?.reasoning && (task === "research" || task === "coding")) s += 20;
  if (model.capabilities?.search && task === "research") s += 15;
  if (model.capabilities?.longContext) s += 5;

  // Speed/quality preset: strong bonus for matching models so e.g. "fast"
  // routes to Flash/Instant and "reasoning" routes to R1/Pro-class.
  if (mode && mode !== "balanced") s += matchesMode(model, mode) ? 45 : -25;

  // Heavy penalty for previous-generation models — Auto should pick the
  // current-gen of any provider, only falling back to legacy if it's the
  // only option left in the chain.
  if (model.legacy) s -= 60;

  // Tie-break by larger context.
  s += Math.min(model.contextWindow / 200_000, 5);
  return s;
}

type Candidate = { provider: LLMProvider; model: ModelDescriptor; score: number };

async function listConfiguredCandidates(
  task: TaskKind,
  allowPaid: boolean,
  onlyTiers?: ProviderTier[],
  mode?: RouteMode,
): Promise<Candidate[]> {
  const nested = await Promise.all(
    ALL_PROVIDERS.map(async (p): Promise<Candidate[]> => {
      const ok = await Promise.resolve(p.isConfigured());
      if (!ok) return [];
      const models = await Promise.resolve(p.listModels());
      const candidates: Candidate[] = [];
      for (const m of models) {
        if (onlyTiers && !onlyTiers.includes(m.tier)) continue;
        const score = scoreModel(m, task, allowPaid, mode);
        if (score < 0) continue;
        candidates.push({ provider: p, model: m, score });
      }
      return candidates;
    }),
  );
  const out = nested.flat();
  out.sort((a, b) => b.score - a.score);
  return out;
}

export async function chooseModel(req: RouteRequest): Promise<RouteResult | null> {
  const task = req.task;
  const allowPaid = !!req.allowPaid && !req.offline;

  // ── 1. Explicit user pick (skip when autoSelect explicitly requested) ──
  if (req.preferred && !req.autoSelect) {
    const r = await resolveModel(req.preferred.providerId, req.preferred.modelId);
    if (r) {
      const fallbacks = await buildFallbacks(task, allowPaid, r, req.mode);
      return {
        chosen: r,
        reason: `User-selected ${r.provider.name} → ${r.model.label}.`,
        fallbacks,
      };
    }
  }

  // ── 2. Offline mode → local only ──
  if (req.offline) {
    const localOnly = await listConfiguredCandidates(task, false, ["local"], req.mode);
    const top = localOnly[0];
    if (top) {
      return {
        chosen: { provider: top.provider, model: top.model },
        reason: `Offline mode → local model ${top.model.label}.`,
        fallbacks: localOnly.slice(1, 4).map((c) => ({ provider: c.provider, model: c.model })),
      };
    }
    return null; // nothing local
  }

  // ── 3. Auto-select ──
  const all = await listConfiguredCandidates(task, allowPaid, undefined, req.mode);
  const top = all[0];
  if (!top) return null;
  const reason = autoReason(top.model, task);
  return {
    chosen: { provider: top.provider, model: top.model },
    reason,
    fallbacks: all.slice(1, 4).map((c) => ({ provider: c.provider, model: c.model })),
  };
}

function autoReason(model: ModelDescriptor, task: TaskKind): string {
  const tierTag = model.tier === "free" ? "free" : model.tier === "local" ? "local" : "paid";
  const why =
    model.preferredFor?.includes(task) ? `preferred for ${task}` :
    model.capabilities?.code && task === "coding" ? "strong at code" :
    model.capabilities?.reasoning && task === "research" ? "strong reasoning" :
    "best available";
  return `Auto-selected ${model.label} (${tierTag}) — ${why}.`;
}

async function buildFallbacks(
  task: TaskKind,
  allowPaid: boolean,
  excluding: ResolvedModel,
  mode?: RouteMode,
): Promise<ResolvedModel[]> {
  const all = await listConfiguredCandidates(task, allowPaid, undefined, mode);
  return all
    .filter((c) => !(c.provider.id === excluding.provider.id && c.model.id === excluding.model.id))
    .slice(0, 3)
    .map((c) => ({ provider: c.provider, model: c.model }));
}

/** When the chosen provider errors out, pop the next fallback. */
export function pickFallback(result: RouteResult): RouteResult | null {
  if (result.fallbacks.length === 0) return null;
  const [next, ...rest] = result.fallbacks;
  return {
    chosen: next,
    reason: `Falling back to ${next.provider.name} → ${next.model.label}.`,
    fallbacks: rest,
  };
}

/** Provider lookup helper for the orchestrator. */
export function providerById(id: string): LLMProvider | null {
  return getProvider(id);
}
