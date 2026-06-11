/**
 * GET /api/providers
 *
 * Returns the set of LLM providers currently usable in this environment,
 * with their models and configured/unconfigured status. The dropdown UI
 * polls this on mount.
 *
 * No personal data is included; safe to call from any signed-in user.
 */

import { ok, withErrorHandling } from "@/lib/api/respond";
import { requireSession } from "@/lib/authz";
import { listAvailableProviders } from "@/lib/llm/providers/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  await requireSession();
  const providers = await listAvailableProviders();
  return ok({ providers });
});
