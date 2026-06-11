/**
 * /api/chat/threads/[id]
 *
 * PATCH  — rename a thread.  Body: { title }
 * DELETE — delete a thread + all its messages.
 */

import { z } from "zod";
import { ok, withErrorHandling, parseJson } from "@/lib/api/respond";
import { requireSession } from "@/lib/authz";
import { renameThread, deleteThread } from "@/lib/db/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const renameSchema = z.object({ title: z.string().min(1).max(120) });

export const PATCH = withErrorHandling(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  const body = renameSchema.parse(await parseJson(req));
  const ok2 = await renameThread(session.id, id, body.title);
  return ok({ renamed: ok2 });
});

export const DELETE = withErrorHandling(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  await deleteThread(session.id, id);
  return ok({ deleted: true });
});
