/**
 * POST /api/roadmap/v2/adapt
 *
 * Strategist adaptive replan: rewrites all not-yet-completed nodes based on
 * progress, scores, notes, and an optional student reason. Completed nodes
 * are preserved. Body: { reason?: string }
 */

import { z } from "zod";
import { NextResponse } from "next/server";
import { ok, fail, withErrorHandling, parseJson } from "@/lib/api/respond";
import { requireSession } from "@/lib/authz";
import { rateLimit, rateLimitHeaders } from "@/lib/ratelimit";
import { getProfile, getRoadmapV2, saveRoadmapV2 } from "@/lib/db/collections";
import { adaptRoadmap } from "@/lib/roadmap/generate";
import { recordStreakActivity } from "@/lib/streak/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const schema = z.object({ reason: z.string().max(2000).optional() });

export const POST = withErrorHandling(async (req) => {
  const session = await requireSession();

  const rl = await rateLimit(session.id, session.plan, "strategist");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit reached — try the adaptation again in a few minutes." },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const body = schema.parse(await parseJson(req).catch(() => ({})));
  const [profile, doc] = await Promise.all([
    getProfile(session.id),
    getRoadmapV2(session.id),
  ]);
  if (!profile) return fail(412, "Complete the intake first.");
  if (!doc) return fail(404, "No roadmap to adapt yet.");

  const adapted = await adaptRoadmap(profile, doc, body.reason);
  if (!adapted) return fail(422, "The Strategist couldn't produce a valid adaptation. Try again.");

  await saveRoadmapV2(session.id, adapted);
  await recordStreakActivity(session.id, "Replanned the roadmap");
  return ok({ doc: adapted });
});
