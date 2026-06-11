import { z } from "zod";

export const StrategistMessageSchema = z.object({
  role: z.enum(["user", "agent", "system"]),
  text: z.string().min(1).max(8000),
});

export const StrategistRequestSchema = z.object({
  threadId: z.string().min(1).max(64).optional(),
  pathId: z.string().min(1).max(64).optional(),
  message: z.string().min(1).max(4000),
  // Optional inline tool toggles
  tools: z
    .object({
      replanRoadmap: z.boolean().default(true),
      searchKb: z.boolean().default(true),
      fetchUrl: z.boolean().default(false),
    })
    .optional(),
  /** Strategist mode. Drives prompt profile + model preference. */
  mode: z.enum(["general", "research", "study", "coding"]).default("general"),
  /** Speed/quality preset for the router (Fast/Balanced/Advanced/Reasoning). */
  routeMode: z.enum(["fast", "balanced", "advanced", "reasoning"]).optional(),
  /** Explicit provider/model pick. */
  model: z
    .object({
      providerId: z.string().min(1).max(40),
      modelId: z.string().min(1).max(120),
    })
    .optional(),
  /** Use auto-select instead of `model`, even if `model` is provided. */
  autoSelect: z.boolean().optional(),
  /** Force offline-only routing (Ollama). */
  offline: z.boolean().optional(),
  /** Allow paid providers in auto-select. */
  allowPaid: z.boolean().optional(),
  /** Live roadmap context from the client store: which node the user is
   *  focused on + recent roadmap events (selections, scores, completions). */
  roadmapContext: z
    .object({
      selectedNodeId: z.string().max(20).optional(),
      recentEvents: z.array(z.string().max(220)).max(10).optional(),
    })
    .optional(),
});

export type StrategistRequest = z.infer<typeof StrategistRequestSchema>;

/** SSE payload schema — every chunk the server emits conforms to this. */
export const ChunkSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"),   delta: z.string() }),
  z.object({ kind: z.literal("source"), label: z.string(), uri: z.string(), source: z.enum(["kb","case","web","profile","roadmap"]) }),
  z.object({ kind: z.literal("tool"),   name: z.string(), status: z.enum(["start","done","error"]), result: z.unknown().optional() }),
  z.object({ kind: z.literal("done"),   messageId: z.string(), tokensIn: z.number().nonnegative(), tokensOut: z.number().nonnegative() }),
  z.object({ kind: z.literal("error"),  message: z.string(), code: z.string().optional() }),
]);

export type StrategistChunk = z.infer<typeof ChunkSchema>;
