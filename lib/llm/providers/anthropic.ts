/**
 * Anthropic Claude provider adapter.
 *
 * Streams via the Messages API (SSE) — no SDK dependency, same pattern as
 * the OpenAI-compat adapters. Gated on ANTHROPIC_API_KEY; until that key
 * exists in .env.local the provider simply reports unconfigured and never
 * appears in the dropdown.
 *
 * Models:
 *   • claude-sonnet-4-6              (balanced default — strong all-rounder)
 *   • claude-haiku-4-5-20251001     (fast, cheap)
 *   • claude-opus-4-8               (most capable — advanced/reasoning)
 */

import type {
  LLMProvider,
  LLMStreamChunk,
  ModelDescriptor,
  StreamRequest,
} from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

function getKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ?? null;
}

const MODELS: ModelDescriptor[] = [
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    tier: "paid",
    costPer1k: 0.015,
    contextWindow: 200_000,
    capabilities: { longContext: true, reasoning: true, code: true },
    preferredFor: ["general", "coding", "research"],
    modes: ["balanced", "advanced", "reasoning"],
  },
  {
    id: "claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    tier: "paid",
    costPer1k: 0.005,
    contextWindow: 200_000,
    capabilities: { longContext: true, code: true },
    preferredFor: ["general", "study"],
    modes: ["fast", "balanced"],
  },
  {
    id: "claude-opus-4-8",
    label: "Claude Opus 4.8",
    tier: "paid",
    costPer1k: 0.075,
    contextWindow: 200_000,
    capabilities: { longContext: true, reasoning: true, code: true },
    preferredFor: ["research", "coding"],
    modes: ["advanced", "reasoning"],
  },
];

export const anthropicProvider: LLMProvider = {
  id: "anthropic",
  name: "Anthropic Claude",
  defaultTier: "paid",
  isConfigured: () => !!getKey(),
  listModels: () => MODELS,

  async *streamChat(req: StreamRequest): AsyncGenerator<LLMStreamChunk> {
    const key = getKey();
    if (!key) throw new Error("Anthropic API key missing");

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify({
        model: req.model,
        system: req.system,
        messages: req.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.content })),
        temperature: req.temperature ?? 0.4,
        max_tokens: req.maxOutputTokens ?? 4096,
        stream: true,
      }),
      signal: req.abortSignal,
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      const err = new Error(`Anthropic error ${res.status}: ${detail.slice(0, 300)}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }

    let tokensIn = 0;
    let tokensOut = 0;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by blank lines.
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          for (const line of frame.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            let evt: {
              type?: string;
              delta?: { type?: string; text?: string };
              message?: { usage?: { input_tokens?: number } };
              usage?: { output_tokens?: number };
            };
            try { evt = JSON.parse(payload); } catch { continue; }

            switch (evt.type) {
              case "message_start":
                tokensIn = evt.message?.usage?.input_tokens ?? 0;
                break;
              case "content_block_delta":
                if (evt.delta?.type === "text_delta" && evt.delta.text) {
                  yield { kind: "text", delta: evt.delta.text };
                }
                break;
              case "message_delta":
                tokensOut = evt.usage?.output_tokens ?? tokensOut;
                break;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { kind: "done", tokensIn, tokensOut };
  },
};
