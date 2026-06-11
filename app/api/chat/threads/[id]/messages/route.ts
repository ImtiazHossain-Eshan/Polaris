/**
 * /api/chat/threads/[id]/messages
 *
 * GET  — list messages on a thread (oldest first).
 * POST — append a user OR assistant message. Used by the client to
 *        persist BOTH sides of an exchange after the streaming response
 *        completes. Body:
 *           { role: "user" | "assistant", text, sources?, providerId?,
 *             modelId?, mode?, tokensIn?, tokensOut? }
 */

import { z } from "zod";
import { ok, withErrorHandling, parseJson, HttpError } from "@/lib/api/respond";
import { requireSession } from "@/lib/authz";
import { appendMessage, getMessages, getThread } from "@/lib/db/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sourceSchema = z.object({
  label: z.string().min(1).max(200),
  uri: z.string().min(1).max(500),
  kind: z.enum(["kb", "case", "web", "profile", "roadmap"]),
});

const appendSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().min(1).max(20000),
  sources: z.array(sourceSchema).max(40).optional(),
  providerId: z.string().max(40).optional(),
  modelId: z.string().max(120).optional(),
  mode: z.enum(["general", "research", "study", "coding"]).optional(),
  tokensIn: z.number().int().nonnegative().optional(),
  tokensOut: z.number().int().nonnegative().optional(),
});

export const GET = withErrorHandling(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  const thread = await getThread(session.id, id);
  if (!thread) throw new HttpError(404, "Thread not found");
  const messages = await getMessages(session.id, id);
  return ok({
    thread: {
      id: thread._id?.toString(),
      title: thread.title,
      messageCount: thread.messageCount,
      lastMessageAt: thread.lastMessageAt,
    },
    messages: messages.map((m) => ({
      id: m._id?.toString(),
      role: m.role,
      text: m.text,
      sources: m.sources ?? [],
      providerId: m.providerId,
      modelId: m.modelId,
      mode: m.mode,
      createdAt: m.createdAt,
    })),
  });
});

export const POST = withErrorHandling(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  const thread = await getThread(session.id, id);
  if (!thread) throw new HttpError(404, "Thread not found");
  const body = appendSchema.parse(await parseJson(req));
  const msg = await appendMessage({
    threadId: id,
    userId: session.id,
    role: body.role,
    text: body.text,
    sources: body.sources,
    providerId: body.providerId,
    modelId: body.modelId,
    mode: body.mode,
    tokensIn: body.tokensIn,
    tokensOut: body.tokensOut,
  });
  return ok({ message: { id: msg._id?.toString(), createdAt: msg.createdAt } });
});
