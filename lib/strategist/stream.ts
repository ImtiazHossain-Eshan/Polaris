/**
 * Server-Sent Events stream for the Strategist agent.
 *
 * Forwards the deep-research orchestrator's chunks over SSE, and fires
 * an async memory-extraction pass once the answer is complete.
 */

import { deepResearch, type ResearchOutcome } from "./research";
import {
  addMemoryFacts,
  getUserMemory,
  type UserMemoryFact,
} from "@/lib/db/collections";
import { extractFactsFromExchange } from "./memory";
import type { StrategistChunk } from "./schemas";
import type { StudentProfile } from "@/lib/profile";
import type { StrategistMode } from "./profiles";
import type { RouteMode } from "@/lib/llm/providers/types";

type StreamInput = {
  userId: string;
  profile: StudentProfile;
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

function sseLine(chunk: StrategistChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

export function strategistStream(input: StreamInput): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const send = (c: StrategistChunk) =>
        controller.enqueue(enc.encode(sseLine(c)));

      try {
        const memDoc = await getUserMemory(input.userId).catch(() => null);
        const memory: UserMemoryFact[] = memDoc?.facts ?? [];

        const outcomeBox: { current?: ResearchOutcome } = {};
        for await (const chunk of deepResearch(
          {
            userId: input.userId,
            profile: input.profile,
            memory,
            recentMilestones: input.recentMilestones,
            userMessage: input.userMessage,
            mode: input.mode,
            routeMode: input.routeMode,
            preferred: input.preferred,
            autoSelect: input.autoSelect,
            offline: input.offline,
            allowPaid: input.allowPaid,
            abortSignal: input.abortSignal,
          },
          outcomeBox,
        )) {
          if (input.abortSignal?.aborted) return;
          send(chunk);
        }

        // Async memory extraction.
        const outcome = outcomeBox.current;
        if (
          outcome &&
          outcome.outcome === "ok" &&
          outcome.answerText.length > 40
        ) {
          void extractFactsFromExchange(
            input.userMessage,
            outcome.answerText,
            memory,
          )
            .then((newFacts) => {
              if (newFacts.length === 0) return;
              return addMemoryFacts(input.userId, newFacts);
            })
            .catch((err) =>
              console.error("[strategist] memory write failed:", err),
            );
        }
      } catch (err) {
        console.error("[strategist] stream error:", err);
        const e = err as { status?: number; message?: string };
        const isQuota =
          e?.status === 429 ||
          /quota|rate.?limit|too many requests|\b429\b/i.test(e?.message ?? "");
        send(
          isQuota
            ? {
                kind: "error",
                code: "AI_QUOTA",
                message:
                  "The Strategist's AI is temporarily over capacity. Please try again.",
              }
            : {
                kind: "error",
                code: "STREAM_FAILED",
                message: "The Strategist hit an error. Try again in a moment.",
              },
        );
      } finally {
        controller.close();
      }
    },
  });
}

export function sseHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  };
}
