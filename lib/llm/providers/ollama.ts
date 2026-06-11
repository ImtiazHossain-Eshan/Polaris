/**
 * Local Ollama provider adapter.
 *
 * Ollama exposes an OpenAI-compatible endpoint at /v1, plus a native
 * /api/tags endpoint we use to enumerate the models the user has actually
 * pulled. So model list is dynamic — whatever they have on disk shows up
 * in the dropdown automatically.
 *
 * Configuration:
 *   OLLAMA_BASE_URL — e.g. http://localhost:11434
 *                     defaults to http://localhost:11434
 *
 * `isConfigured()` does a fast TCP-level probe to /api/tags with a 500ms
 * timeout so the registry can decide whether to surface this provider
 * without a noisy error if the user isn't running Ollama.
 */

import type {
  LLMProvider,
  LLMStreamChunk,
  ModelDescriptor,
  StreamRequest,
} from "./types";

const DEFAULT_BASE = "http://localhost:11434";

function baseUrl(): string {
  return (process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
}

let cachedReachable: { value: boolean; ts: number } | null = null;
const REACHABILITY_TTL_MS = 8_000; // short so fresh installs surface fast

let cachedModels: { value: ModelDescriptor[]; ts: number } | null = null;
const MODEL_TTL_MS = 15_000;

/** Force a re-probe on the next call (used by the Refresh button). */
export function invalidateOllamaCache() {
  cachedReachable = null;
  cachedModels = null;
}

async function probe(): Promise<boolean> {
  const now = Date.now();
  if (cachedReachable && now - cachedReachable.ts < REACHABILITY_TTL_MS) {
    return cachedReachable.value;
  }
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 400);
    const res = await fetch(`${baseUrl()}/api/tags`, { signal: ctrl.signal });
    clearTimeout(timeout);
    const ok = res.ok;
    cachedReachable = { value: ok, ts: now };
    return ok;
  } catch {
    cachedReachable = { value: false, ts: now };
    return false;
  }
}

async function discoverModels(): Promise<ModelDescriptor[]> {
  const now = Date.now();
  if (cachedModels && now - cachedModels.ts < MODEL_TTL_MS) {
    return cachedModels.value;
  }
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`${baseUrl()}/api/tags`, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      cachedModels = { value: [], ts: now };
      return [];
    }
    const data = (await res.json()) as {
      models?: Array<{ name: string; details?: { parameter_size?: string } }>;
    };
    const descs: ModelDescriptor[] = (data.models ?? []).map((m) => ({
      id: m.name,
      label: `${m.name}${m.details?.parameter_size ? ` (${m.details.parameter_size})` : ""} — local`,
      tier: "local" as const,
      contextWindow: guessContext(m.name),
      capabilities: guessCapabilities(m.name),
      preferredFor: guessPreferredFor(m.name),
    }));
    cachedModels = { value: descs, ts: now };
    return descs;
  } catch {
    cachedModels = { value: [], ts: now };
    return [];
  }
}

function guessContext(modelId: string): number {
  // Best-effort heuristic; Ollama models vary widely.
  if (/llama-?3/.test(modelId)) return 128_000;
  if (/llama-?2/.test(modelId)) return 4096;
  if (/mistral|mixtral/.test(modelId)) return 32_768;
  if (/qwen/.test(modelId)) return 32_768;
  if (/phi-?3/.test(modelId)) return 128_000;
  return 8192;
}

function guessCapabilities(modelId: string): ModelDescriptor["capabilities"] {
  const isCode = /code|coder|qwen-?coder|starcoder|deepseek-coder/i.test(modelId);
  const isReasoning = /r1|reasoning|deepseek/i.test(modelId);
  return {
    code: isCode || /llama|qwen|deepseek/i.test(modelId),
    reasoning: isReasoning,
    longContext: /llama-?3|phi-?3|qwen/i.test(modelId),
  };
}

function guessPreferredFor(modelId: string): ModelDescriptor["preferredFor"] {
  if (/code|coder/i.test(modelId)) return ["coding"];
  if (/r1|deepseek/i.test(modelId)) return ["research", "coding"];
  return ["general", "study"];
}

/** Rich live status for the settings panel + model picker indicator. */
export type OllamaLiveStatus = {
  baseUrl: string;
  reachable: boolean;
  version?: string;
  models: Array<{
    name: string;
    parameterSize?: string;
    sizeBytes?: number;
    family?: string;
    quant?: string;
    modifiedAt?: string;
  }>;
  /** Round-trip latency to /api/tags in ms. */
  latencyMs?: number;
  errorMessage?: string;
};

export async function getOllamaStatus(): Promise<OllamaLiveStatus> {
  const url = baseUrl();
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 1500);
    const [tagsRes, versionRes] = await Promise.all([
      fetch(`${url}/api/tags`, { signal: ctrl.signal }),
      fetch(`${url}/api/version`, { signal: ctrl.signal }).catch(() => null),
    ]);
    clearTimeout(timeout);
    const latencyMs = Date.now() - t0;
    if (!tagsRes.ok) {
      return { baseUrl: url, reachable: false, models: [], latencyMs, errorMessage: `HTTP ${tagsRes.status}` };
    }
    const tagsJson = (await tagsRes.json()) as {
      models?: Array<{
        name: string;
        modified_at?: string;
        size?: number;
        details?: { parameter_size?: string; family?: string; quantization_level?: string };
      }>;
    };
    const versionJson = versionRes && versionRes.ok
      ? ((await versionRes.json()) as { version?: string })
      : undefined;
    return {
      baseUrl: url,
      reachable: true,
      version: versionJson?.version,
      latencyMs,
      models: (tagsJson.models ?? []).map((m) => ({
        name: m.name,
        parameterSize: m.details?.parameter_size,
        sizeBytes: m.size,
        family: m.details?.family,
        quant: m.details?.quantization_level,
        modifiedAt: m.modified_at,
      })),
    };
  } catch (err) {
    return {
      baseUrl: url,
      reachable: false,
      models: [],
      latencyMs: Date.now() - t0,
      errorMessage: err instanceof Error ? err.message : "unreachable",
    };
  }
}

export const ollamaProvider: LLMProvider = {
  id: "ollama",
  name: "Ollama (local)",
  defaultTier: "local",
  isConfigured: () => probe(),
  listModels: () => discoverModels(),
  async *streamChat(req: StreamRequest): AsyncGenerator<LLMStreamChunk> {
    const body = {
      model: req.model,
      stream: true,
      temperature: req.temperature ?? 0.55,
      max_tokens: req.maxOutputTokens ?? 1800,
      messages: [
        { role: "system" as const, content: req.system },
        ...req.messages,
      ],
    };

    const res = await fetch(`${baseUrl()}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Ollama ignores auth, but some compat wrappers expect it.
        authorization: "Bearer ollama",
      },
      body: JSON.stringify(body),
      signal: req.abortSignal,
    });

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Ollama error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let tokensIn = 0;
    let tokensOut = 0;

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (req.abortSignal?.aborted) return;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const raw = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of raw.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
              usage?: { prompt_tokens?: number; completion_tokens?: number };
            };
            const piece = j.choices?.[0]?.delta?.content;
            if (piece) yield { kind: "text", delta: piece };
            if (j.usage) {
              tokensIn = j.usage.prompt_tokens ?? tokensIn;
              tokensOut = j.usage.completion_tokens ?? tokensOut;
            }
          } catch {
            // ignore malformed line
          }
        }
      }
    }

    yield { kind: "done", tokensIn, tokensOut };
  },
};
