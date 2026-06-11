/**
 * /api/account/model-pref
 *
 * GET — the signed-in user's saved AI model preference (choice/mode/flags).
 * PUT — save a new preference. Validated server-side; never contains keys.
 *
 * The Strategist picker reads this on mount and writes through on change,
 * so the selection follows the user across devices, and server-side jobs
 * (roadmap generation, weekly replans) honor it too.
 */

import { ok, withErrorHandling, parseJson } from "@/lib/api/respond";
import { requireSession } from "@/lib/authz";
import { AiPrefSchema, getAiPref, saveAiPref } from "@/lib/llm/prefs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  const session = await requireSession();
  const pref = await getAiPref(session.id);
  return ok({ pref });
});

export const PUT = withErrorHandling(async (req) => {
  const session = await requireSession();
  const pref = AiPrefSchema.parse(await parseJson(req));
  await saveAiPref(session.id, pref);
  return ok({ pref });
});
