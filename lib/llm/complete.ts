/**
 * Non-streaming completion helper on top of the smart router.
 *
 * Used by server-side jobs that need a full text response (weekly task
 * generation, replans, submission feedback) rather than an SSE stream.
 * Walks the router's fallback chain on failure.
 */

import { chooseModel, pickFallback, type RouteResult } from "./router";
import type { ChatMessage, TaskKind } from "./providers/types";

export type CompleteRequest = {
  task?: TaskKind;
  system: string;
  messages: ChatMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  abortSignal?: AbortSignal;
};

export async function completeText(req: CompleteRequest): Promise<string | null> {
  let route: RouteResult | null = await chooseModel({
    task: req.task ?? "general",
    autoSelect: true,
    allowPaid: false,
  });

  while (route) {
    const current: RouteResult = route;
    try {
      let out = "";
      for await (const chunk of current.chosen.provider.streamChat({
        model: current.chosen.model.id,
        system: req.system,
        messages: req.messages,
        temperature: req.temperature ?? 0.4,
        maxOutputTokens: req.maxOutputTokens ?? 4096,
        abortSignal: req.abortSignal,
      })) {
        if (chunk.kind === "text") out += chunk.delta;
      }
      if (out.trim().length > 0) return out;
      route = pickFallback(current);
    } catch (err) {
      console.error(`[completeText] ${current.chosen.provider.id}/${current.chosen.model.id} failed:`, err);
      route = pickFallback(current);
    }
  }
  return null;
}

/**
 * Extract the first JSON object/array from an LLM response that may be
 * wrapped in markdown fences or prose.
 */
export function extractJson(text: string): unknown | null {
  // Prefer fenced blocks.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = fence ? [fence[1], text] : [text];
  for (const c of candidates) {
    const start = c.search(/[[{]/);
    if (start === -1) continue;
    // Walk from the first bracket and find the matching close by depth.
    const open = c[start];
    const close = open === "[" ? "]" : "}";
    let depth = 0;
    for (let i = start; i < c.length; i++) {
      if (c[i] === open) depth++;
      else if (c[i] === close) {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(c.slice(start, i + 1));
          } catch {
            break;
          }
        }
      }
    }
  }
  return null;
}
