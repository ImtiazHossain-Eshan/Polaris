/**
 * Provider-agnostic LLM types.
 *
 * Every provider (Gemini, OpenAI, Groq, OpenRouter, Together, Ollama, …)
 * implements the `LLMProvider` interface below so the Strategist
 * orchestrator can route any request through any backend without caring
 * about its native SDK.
 */

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

/** A single chunk emitted by `streamChat`. */
export type LLMStreamChunk =
  | { kind: "text"; delta: string }
  /** Emitted when the provider has finished a search/grounding sub-step. */
  | {
      kind: "web_source";
      uri: string;
      title: string;
    }
  /** Emitted exactly once when the stream ends. */
  | {
      kind: "done";
      tokensIn?: number;
      tokensOut?: number;
      searchQueries?: string[];
    };

export type ProviderTier = "free" | "paid" | "local";
export type TaskKind = "general" | "research" | "study" | "coding";

/**
 * User-facing speed/quality preset. Orthogonal to TaskKind: the task says
 * WHAT the request is, the mode says HOW the user wants it served —
 * fast (low latency), balanced (default), advanced (strongest model),
 * reasoning (multi-step thinking).
 */
export type RouteMode = "fast" | "balanced" | "advanced" | "reasoning";

/** Static descriptor for a model exposed by a provider. */
export type ModelDescriptor = {
  /** Internal id used in API responses / URLs (e.g. "gemini-2.5-flash"). */
  id: string;
  /** Human label for the dropdown. */
  label: string;
  /** "free" / "paid" / "local" — drives the cost optimizer + UI tag. */
  tier: ProviderTier;
  /** Optional approximate cost per 1K output tokens (USD). 0 for free/local. */
  costPer1k?: number;
  /** Approximate context window (tokens). */
  contextWindow: number;
  /** Capability flags the router consults. */
  capabilities?: {
    /** Provider runs a native web search tool. */
    search?: boolean;
    /** Strong at long documents (>32K tokens). */
    longContext?: boolean;
    /** Strong at code synthesis. */
    code?: boolean;
    /** Strong at multi-step reasoning. */
    reasoning?: boolean;
  };
  /** Tasks this model is preferred for when auto-selecting. */
  preferredFor?: TaskKind[];
  /** Speed/quality presets this model is a strong pick for. */
  modes?: RouteMode[];
  /** Previous-generation model; hidden from the dropdown by default. */
  legacy?: boolean;
};

export type StreamRequest = {
  model: string;
  /** System prompt — placed in `role: "system"` for OpenAI-compat, or `systemInstruction` for Gemini. */
  system: string;
  messages: ChatMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  /** When true and provider supports it, enable the native web-search/grounding tool. */
  webSearch?: boolean;
  abortSignal?: AbortSignal;
};

/** Common shape every provider adapter satisfies. */
export interface LLMProvider {
  /** Stable id, e.g. "gemini", "groq", "ollama". */
  id: string;
  /** Display name. */
  name: string;
  /** True if env vars / local service is reachable so the provider is usable. */
  isConfigured(): boolean | Promise<boolean>;
  /** All models the provider exposes (may be filtered later by config). */
  listModels(): Promise<ModelDescriptor[]> | ModelDescriptor[];
  /** Streamed chat completion. */
  streamChat(req: StreamRequest): AsyncGenerator<LLMStreamChunk>;
  /** Short tag for the UI: "free", "paid", "local". */
  defaultTier: ProviderTier;
}

/**
 * Resolved provider + model pair returned by the router. The orchestrator
 * always works with this struct rather than raw strings.
 */
export type ResolvedModel = {
  provider: LLMProvider;
  model: ModelDescriptor;
};
