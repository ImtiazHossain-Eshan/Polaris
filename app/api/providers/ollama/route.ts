/**
 * /api/providers/ollama
 *
 * GET    — live status (reachable, version, models, latency)
 * DELETE — invalidate the cached probe so the next request hits the daemon
 *          (used by the Settings → Local LLM "Refresh" button)
 */

import { ok, withErrorHandling } from "@/lib/api/respond";
import { requireSession } from "@/lib/authz";
import { getOllamaStatus, invalidateOllamaCache } from "@/lib/llm/providers/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  await requireSession();
  const status = await getOllamaStatus();
  return ok({ status });
});

export const DELETE = withErrorHandling(async () => {
  await requireSession();
  invalidateOllamaCache();
  const status = await getOllamaStatus();
  return ok({ status, refreshed: true });
});
