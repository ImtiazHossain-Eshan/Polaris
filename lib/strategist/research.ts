/**
 * Deep-research orchestrator for the Strategist (multi-provider edition).
 *
 * Routes the request through the smart router (lib/llm/router.ts), so the
 * actual backend is whatever the user picked or whatever auto-selected —
 * Gemini, Groq, OpenRouter, Together, OpenAI, or local Ollama.
 *
 * On provider failure, walks the router's fallback chain before giving up.
 * Emits SSE-shaped chunks the existing chat client already understands,
 * plus a `tool: model_route` event with the chosen model + reason for the
 * usage dashboard.
 */

import { searchKb, type KbHit } from "@/lib/rag/search";
import { shortDomain, tavilySearch } from "@/lib/llm/web-search";
import {
  selectRelevantFacts,
  renderMemoryBlock,
} from "./memory";
import {
  buildResearchSystemPrompt,
  REFUSAL_FALLBACK,
} from "./prompt";
import {
  modeInstructions,
  modeWantsWebSearch,
  type StrategistMode,
} from "./profiles";
import { chooseModel, pickFallback, type RouteResult } from "@/lib/llm/router";
import type { RouteMode } from "@/lib/llm/providers/types";
import { recordUsage } from "@/lib/db/collections";
import type { StrategistChunk } from "./schemas";
import type { StudentProfile } from "@/lib/profile";
import type { UserMemoryFact } from "@/lib/db/collections";

export type ResearchInput = {
  userId: string;
  profile: StudentProfile;
  memory: UserMemoryFact[];
  recentMilestones: string[];
  userMessage: string;
  mode: StrategistMode;
  routeMode?: RouteMode;
  preferred?: { providerId: string; modelId: string };
  autoSelect?: boolean;
  offline?: boolean;
  allowPaid?: boolean;
  abortSignal?: AbortSignal;
};

export type ResearchOutcome = {
  answerText: string;
  webSources: Array<{ uri: string; title: string }>;
  kbHits: KbHit[];
  providerId: string;
  modelId: string;
  tier: "free" | "paid" | "local";
  fallbackUsed: boolean;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  outcome: "ok" | "error";
};

export async function* deepResearch(
  input: ResearchInput,
  outcome: { current?: ResearchOutcome },
): AsyncGenerator<StrategistChunk> {
  // 1. KB grounding (always).
  const kbHits = await searchKb(input.userMessage, 4).catch(() => [] as KbHit[]);
  for (const h of kbHits) {
    yield { kind: "source", label: h.title, uri: `kb://${h.id}`, source: "kb" };
  }

  // 2. Pick a model via the router.
  let route = await chooseModel({
    task: input.mode,
    mode: input.routeMode,
    preferred: input.preferred,
    autoSelect: input.autoSelect,
    offline: input.offline,
    allowPaid: input.allowPaid,
  });

  if (!route) {
    yield* deterministicFallback(input);
    outcome.current = {
      answerText: REFUSAL_FALLBACK,
      webSources: [],
      kbHits,
      providerId: "none",
      modelId: "none",
      tier: "free",
      fallbackUsed: false,
      tokensIn: 0,
      tokensOut: REFUSAL_FALLBACK.split(" ").length,
      latencyMs: 0,
      outcome: "ok",
    };
    return;
  }

  yield {
    kind: "tool",
    name: "model_route",
    status: "done",
    result: {
      providerId: route.chosen.provider.id,
      providerName: route.chosen.provider.name,
      modelId: route.chosen.model.id,
      modelLabel: route.chosen.model.label,
      tier: route.chosen.model.tier,
      reason: route.reason,
      fallbacks: route.fallbacks.map((f) => ({
        providerId: f.provider.id,
        modelId: f.model.id,
      })),
    },
  };

  // 3. Build prompts.
  const relevantMemory = selectRelevantFacts(input.memory, input.userMessage, 8);
  const baseSystem = buildResearchSystemPrompt(
    input.profile,
    input.recentMilestones,
    relevantMemory,
  );
  const fullSystem = baseSystem + modeInstructions(input.mode);

  const wantsSearch = modeWantsWebSearch(input.mode);
  const providerHasSearch = !!route.chosen.model.capabilities?.search;

  // 4. If the chosen model can't search and we want web context, do a
  //    Tavily pre-fetch and inline the snippets into the user prompt.
  let webContext = "";
  let preFetchedSources: Array<{ uri: string; title: string }> = [];
  if (wantsSearch && !providerHasSearch && process.env.TAVILY_API_KEY) {
    yield { kind: "tool", name: "web_search", status: "start" };
    const tav = await tavilySearch(input.userMessage, { maxResults: 5 });
    if (tav.length) {
      webContext =
        `<web>\n` +
        tav.map((r) => `[${shortDomain(r.url)}] ${r.title}\n${r.snippet}\n${r.url}`).join("\n\n") +
        `\n</web>\n\n`;
      preFetchedSources = tav.map((r) => ({
        uri: r.url,
        title: r.title || shortDomain(r.url),
      }));
      for (const s of preFetchedSources) {
        yield { kind: "source", label: s.title, uri: s.uri, source: "web" };
      }
    }
    yield {
      kind: "tool",
      name: "web_search",
      status: "done",
      result: { sources: preFetchedSources.length, viaTavily: true },
    };
  } else if (wantsSearch && providerHasSearch) {
    yield { kind: "tool", name: "web_search", status: "start" };
  }

  const userPrompt = [
    `<kb>`,
    kbHits.length
      ? kbHits.map((h) => `[${h.id}] ${h.title}: ${h.snippet}`).join("\n\n")
      : "(no internal KB matches)",
    `</kb>`,
    ``,
    webContext,
    `<memory>`,
    renderMemoryBlock(relevantMemory),
    `</memory>`,
    ``,
    `<question>${input.userMessage}</question>`,
  ].join("\n");

  // 5. Stream from the chosen provider, walking fallbacks on failure.
  const startedAt = Date.now();
  let answerText = "";
  let webSources: Array<{ uri: string; title: string }> = [...preFetchedSources];
  let tokensIn = 0;
  let tokensOut = 0;
  let fallbackUsed = false;
  let lastError: Error | null = null;

  while (route) {
    const attemptStart = Date.now();
    let attemptOk = false;
    try {
      for await (const chunk of route.chosen.provider.streamChat({
        model: route.chosen.model.id,
        system: fullSystem,
        messages: [{ role: "user", content: userPrompt }],
        temperature: input.mode === "coding" ? 0.3 : 0.55,
        maxOutputTokens: 1800,
        webSearch: wantsSearch && providerHasSearch,
        abortSignal: input.abortSignal,
      })) {
        if (input.abortSignal?.aborted) {
          attemptOk = true;
          break;
        }
        if (chunk.kind === "text") {
          answerText += chunk.delta;
          yield { kind: "text", delta: chunk.delta };
        } else if (chunk.kind === "web_source") {
          if (!webSources.find((s) => s.uri === chunk.uri)) {
            webSources.push({ uri: chunk.uri, title: chunk.title });
            yield { kind: "source", label: chunk.title, uri: chunk.uri, source: "web" };
          }
        } else if (chunk.kind === "done") {
          tokensIn = chunk.tokensIn ?? tokensIn;
          tokensOut = chunk.tokensOut ?? tokensOut;
          if (wantsSearch && providerHasSearch) {
            yield {
              kind: "tool",
              name: "web_search",
              status: "done",
              result: {
                sources: webSources.length,
                queries: chunk.searchQueries ?? [],
              },
            };
          }
          attemptOk = true;
        }
      }
      if (attemptOk) break;
    } catch (err) {
      lastError = err as Error;
      const next = pickFallback(route);
      // Reset partial answer state for the next attempt.
      answerText = "";
      webSources = [...preFetchedSources];
      tokensIn = 0;
      tokensOut = 0;
      if (!next) break;
      fallbackUsed = true;
      yield {
        kind: "tool",
        name: "model_route",
        status: "done",
        result: {
          providerId: next.chosen.provider.id,
          providerName: next.chosen.provider.name,
          modelId: next.chosen.model.id,
          modelLabel: next.chosen.model.label,
          tier: next.chosen.model.tier,
          reason: next.reason,
          fallbacks: next.fallbacks.map((f) => ({
            providerId: f.provider.id,
            modelId: f.model.id,
          })),
        },
      };
      route = next;
      continue;
    }
    break;
  }

  const latencyMs = Date.now() - startedAt;

  if (answerText.length === 0 && lastError) {
    const e = lastError as Error & { status?: number };
    const isQuota =
      e.status === 429 ||
      /quota|rate.?limit|too many requests|\b429\b/i.test(e.message ?? "");
    yield {
      kind: "error",
      code: isQuota ? "AI_QUOTA" : "STREAM_FAILED",
      message: isQuota
        ? "All available AI providers are over capacity right now. Try again in a minute."
        : "The Strategist hit an error and ran out of fallbacks.",
    };
    outcome.current = {
      answerText: "",
      webSources,
      kbHits,
      providerId: route?.chosen.provider.id ?? "none",
      modelId: route?.chosen.model.id ?? "none",
      tier: (route?.chosen.model.tier ?? "free") as "free" | "paid" | "local",
      fallbackUsed,
      tokensIn,
      tokensOut,
      latencyMs,
      outcome: "error",
    };
    void recordUsage({
      userId: input.userId,
      providerId: route?.chosen.provider.id ?? "none",
      modelId: route?.chosen.model.id ?? "none",
      tier: (route?.chosen.model.tier ?? "free") as "free" | "paid" | "local",
      mode: input.mode,
      tokensIn,
      tokensOut,
      latencyMs,
      fallback: fallbackUsed,
      outcome: "error",
      errorCode: isQuota ? "AI_QUOTA" : "STREAM_FAILED",
    });
    return;
  }

  yield {
    kind: "done",
    messageId: crypto.randomUUID(),
    tokensIn,
    tokensOut,
  };

  outcome.current = {
    answerText,
    webSources,
    kbHits,
    providerId: route!.chosen.provider.id,
    modelId: route!.chosen.model.id,
    tier: route!.chosen.model.tier,
    fallbackUsed,
    tokensIn,
    tokensOut,
    latencyMs,
    outcome: "ok",
  };

  void recordUsage({
    userId: input.userId,
    providerId: route!.chosen.provider.id,
    modelId: route!.chosen.model.id,
    tier: route!.chosen.model.tier,
    mode: input.mode,
    tokensIn,
    tokensOut,
    latencyMs,
    fallback: fallbackUsed,
    outcome: "ok",
  });
}

/** Used when literally no provider is configured. */
async function* deterministicFallback(
  input: ResearchInput,
): AsyncGenerator<StrategistChunk> {
  const reply = REFUSAL_FALLBACK;
  for (const word of reply.split(" ")) {
    if (input.abortSignal?.aborted) return;
    yield { kind: "text", delta: word + " " };
    await new Promise((r) => setTimeout(r, 18));
  }
  yield {
    kind: "done",
    messageId: crypto.randomUUID(),
    tokensIn: 0,
    tokensOut: reply.split(" ").length,
  };
}

/** Used by the stream layer to pull `RouteResult` for logging. */
export type { RouteResult };
