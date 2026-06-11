/**
 * Google Gemini provider adapter.
 *
 * Uses the existing `@google/generative-ai` SDK. Exposes:
 *   • gemini-2.5-flash    (default — fast, free tier)
 *   • gemini-2.5-pro      (smarter, slower)
 *   • gemini-3.5-flash    (newer flash — if available in your account)
 *   • gemini-2.0-flash-001 (previous Flash)
 *   • gemini-1.5-flash    (legacy fallback)
 *
 * Honors `webSearch: true` by enabling the first-party `googleSearch`
 * grounding tool. Citations come back as `web_source` chunks.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  LLMProvider,
  LLMStreamChunk,
  ModelDescriptor,
  StreamRequest,
} from "./types";

function getKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

const MODELS: ModelDescriptor[] = [
  // ─── Current generation (visible by default) ──────────────────────
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    tier: "free",
    contextWindow: 1_000_000,
    capabilities: { search: true, longContext: true, reasoning: true, code: true },
    preferredFor: ["general", "research", "study", "coding"],
    modes: ["fast", "balanced"],
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    tier: "free", // free tier exists, just rate-limited
    contextWindow: 2_000_000,
    capabilities: { search: true, longContext: true, reasoning: true, code: true },
    preferredFor: ["research"],
    modes: ["advanced", "reasoning"],
  },
  // ─── Legacy (hidden behind "Show older models" toggle) ────────────
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    tier: "free",
    contextWindow: 1_000_000,
    capabilities: { search: true, longContext: true, code: true },
    legacy: true,
  },
  {
    id: "gemini-2.0-flash-001",
    label: "Gemini 2.0 Flash",
    tier: "free",
    contextWindow: 1_000_000,
    capabilities: { search: true, longContext: true, code: true },
    legacy: true,
  },
  {
    id: "gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    tier: "free",
    contextWindow: 1_000_000,
    capabilities: { search: true, longContext: true },
    legacy: true,
  },
];

export const geminiProvider: LLMProvider = {
  id: "gemini",
  name: "Google Gemini",
  defaultTier: "free",
  isConfigured: () => !!getKey(),
  listModels: () => MODELS,
  async *streamChat(req: StreamRequest): AsyncGenerator<LLMStreamChunk> {
    const key = getKey();
    if (!key) throw new Error("Gemini API key missing");
    const client = new GoogleGenerativeAI(key);

    // Convert OpenAI-style messages into Gemini's `history` + last user turn.
    const history = req.messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const last = req.messages[req.messages.length - 1];
    if (!last) throw new Error("Empty messages array");

    const tools = req.webSearch
      ? [{ googleSearch: {} } as Record<string, unknown>]
      : undefined;

    const model = client.getGenerativeModel({
      model: req.model,
      systemInstruction: req.system,
      // SDK types don't cover the 2.0+ googleSearch tool — runtime supports it.
      tools: tools as any,
      generationConfig: {
        temperature: req.temperature ?? 0.55,
        maxOutputTokens: req.maxOutputTokens ?? 1800,
      },
    });

    const chat = model.startChat({ history: history as any });
    const result = await chat.sendMessageStream(last.content);

    for await (const piece of result.stream) {
      if (req.abortSignal?.aborted) return;
      const txt = piece.text();
      if (txt) yield { kind: "text", delta: txt };
    }

    const final = await result.response;
    const candidate = (final as any).candidates?.[0];
    const md = candidate?.groundingMetadata;

    if (md?.groundingChunks && Array.isArray(md.groundingChunks)) {
      const seen = new Set<string>();
      for (const c of md.groundingChunks) {
        const uri: string | undefined = c?.web?.uri;
        const title: string | undefined = c?.web?.title;
        if (!uri || seen.has(uri)) continue;
        seen.add(uri);
        yield { kind: "web_source", uri, title: title?.trim() || uri };
      }
    }

    const usage = final.usageMetadata;
    yield {
      kind: "done",
      tokensIn: usage?.promptTokenCount ?? 0,
      tokensOut: usage?.candidatesTokenCount ?? 0,
      searchQueries: (md?.webSearchQueries as string[] | undefined) ?? [],
    };
  },
};
