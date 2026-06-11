/**
 * Generic OpenAI-compatible chat-completions adapter.
 *
 * Used to back several free-tier providers that all speak the same
 * REST shape:
 *   • Groq          (free, very fast Llama-3.3 / Mixtral)
 *   • OpenRouter    (aggregator with free tier models like Llama-3 70B)
 *   • Together AI   (free credit, hosts many open models)
 *   • OpenAI        (paid, used as upgrade path)
 *
 * Constructed via `makeOpenAIProvider({ id, name, baseUrl, ... })` so
 * the registry can spin one up per configured key.
 */

import type {
  LLMProvider,
  LLMStreamChunk,
  ModelDescriptor,
  ProviderTier,
  StreamRequest,
} from "./types";

type OpenAIProviderOpts = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: () => string | null;
  defaultTier: ProviderTier;
  models: ModelDescriptor[];
  /** Extra headers (e.g. OpenRouter requires HTTP-Referer). */
  extraHeaders?: () => Record<string, string>;
};

export function makeOpenAIProvider(opts: OpenAIProviderOpts): LLMProvider {
  return {
    id: opts.id,
    name: opts.name,
    defaultTier: opts.defaultTier,
    isConfigured: () => !!opts.apiKey(),
    listModels: () => opts.models,
    async *streamChat(req: StreamRequest): AsyncGenerator<LLMStreamChunk> {
      const key = opts.apiKey();
      if (!key) throw new Error(`${opts.name} API key missing`);

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

      const res = await fetch(`${opts.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
          ...(opts.extraHeaders?.() ?? {}),
        },
        body: JSON.stringify(body),
        signal: req.abortSignal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        const err = new Error(
          `${opts.name} chat error ${res.status}: ${errText.slice(0, 200)}`,
        ) as Error & { status?: number };
        err.status = res.status;
        throw err;
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

        // SSE frames are separated by \n\n; each starts with "data: ".
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
              // Skip malformed lines.
            }
          }
        }
      }

      yield { kind: "done", tokensIn, tokensOut };
    },
  };
}

/* ─── Built-in instances ──────────────────────────────────────────────── */

const GROQ_MODELS: ModelDescriptor[] = [
  {
    id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B (Groq)",
    tier: "free",
    contextWindow: 131_072,
    capabilities: { code: true, reasoning: true },
    preferredFor: ["general", "study", "coding"],
  },
  {
    id: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B Instant (Groq)",
    tier: "free",
    contextWindow: 131_072,
    preferredFor: ["general"],
  },
  {
    id: "mixtral-8x7b-32768",
    label: "Mixtral 8x7B (Groq)",
    tier: "free",
    contextWindow: 32_768,
    legacy: true,
  },
];

export const groqProvider = makeOpenAIProvider({
  id: "groq",
  name: "Groq",
  baseUrl: "https://api.groq.com/openai/v1",
  apiKey: () => process.env.GROQ_API_KEY ?? null,
  defaultTier: "free",
  models: GROQ_MODELS,
});

const OPENROUTER_MODELS: ModelDescriptor[] = [
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B (OpenRouter, free)",
    tier: "free",
    contextWindow: 131_072,
    capabilities: { code: true },
    preferredFor: ["general", "coding"],
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    label: "Gemini 2.0 Flash (OpenRouter, free)",
    tier: "free",
    contextWindow: 1_000_000,
  },
  {
    id: "deepseek/deepseek-r1:free",
    label: "DeepSeek R1 (OpenRouter, free)",
    tier: "free",
    contextWindow: 65_536,
    capabilities: { reasoning: true },
    preferredFor: ["research", "coding"],
  },
];

export const openRouterProvider = makeOpenAIProvider({
  id: "openrouter",
  name: "OpenRouter",
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: () => process.env.OPENROUTER_API_KEY ?? null,
  defaultTier: "free",
  models: OPENROUTER_MODELS,
  extraHeaders: () => ({
    "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000",
    "X-Title": "Polaris",
  }),
});

const TOGETHER_MODELS: ModelDescriptor[] = [
  {
    id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    label: "Llama 3.3 70B Turbo (Together)",
    tier: "free",
    contextWindow: 131_072,
    capabilities: { code: true, reasoning: true },
  },
];

export const togetherProvider = makeOpenAIProvider({
  id: "together",
  name: "Together AI",
  baseUrl: "https://api.together.xyz/v1",
  apiKey: () => process.env.TOGETHER_API_KEY ?? null,
  defaultTier: "free",
  models: TOGETHER_MODELS,
});

const OPENAI_MODELS: ModelDescriptor[] = [
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    tier: "paid",
    costPer1k: 0.0006,
    contextWindow: 128_000,
    capabilities: { code: true, reasoning: true },
    preferredFor: ["general", "coding"],
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    tier: "paid",
    costPer1k: 0.01,
    contextWindow: 128_000,
    capabilities: { code: true, reasoning: true },
    preferredFor: ["research", "coding"],
  },
];

export const openAIProvider = makeOpenAIProvider({
  id: "openai",
  name: "OpenAI",
  baseUrl: "https://api.openai.com/v1",
  apiKey: () => process.env.OPENAI_API_KEY ?? null,
  defaultTier: "paid",
  models: OPENAI_MODELS,
});
