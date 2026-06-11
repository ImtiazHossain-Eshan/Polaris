/**
 * /api/chat/threads
 *
 * GET   — list the user's threads, newest first.
 * POST  — create a new thread.  Body: { title? }
 */

import { z } from "zod";
import { ok, withErrorHandling, parseJson } from "@/lib/api/respond";
import { requireSession } from "@/lib/authz";
import { createThread, listThreads } from "@/lib/db/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1).max(120).optional(),
});

export const GET = withErrorHandling(async () => {
  const session = await requireSession();
  const threads = await listThreads(session.id);
  return ok({
    threads: threads.map((t) => ({
      id: t._id?.toString(),
      title: t.title,
      messageCount: t.messageCount,
      lastMessageAt: t.lastMessageAt,
      createdAt: t.createdAt,
      lastMode: t.lastMode,
    })),
  });
});

export const POST = withErrorHandling(async (req) => {
  const session = await requireSession();
  const body = createSchema.parse(await parseJson(req).catch(() => ({})));
  const t = await createThread(session.id, body.title ?? "New chat");
  return ok({
    thread: {
      id: t._id?.toString(),
      title: t.title,
      messageCount: t.messageCount,
      lastMessageAt: t.lastMessageAt,
      createdAt: t.createdAt,
    },
  });
});
