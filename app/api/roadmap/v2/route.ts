/**
 * /api/roadmap/v2
 *
 * GET    — the user's live roadmap doc, or { doc: null } → setup needed.
 * POST   — body = RoadmapConfig → generate + save a fresh roadmap.
 * DELETE — wipe the roadmap (back to setup).
 */

import { NextResponse } from "next/server";
import { ok, withErrorHandling, parseJson } from "@/lib/api/respond";
import { requireSession } from "@/lib/authz";
import { rateLimit, rateLimitHeaders } from "@/lib/ratelimit";
import { getProfile, getRoadmapV2, saveRoadmapV2, deleteRoadmapV2 } from "@/lib/db/collections";
import { RoadmapConfigSchema } from "@/lib/roadmap/types";
import { generateRoadmap } from "@/lib/roadmap/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90; // generation is an LLM call

export const GET = withErrorHandling(async () => {
  const session = await requireSession();
  const doc = await getRoadmapV2(session.id);
  return ok({ doc });
});

export const POST = withErrorHandling(async (req) => {
  const session = await requireSession();

  const rl = await rateLimit(session.id, session.plan, "strategist");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit reached — try again in a few minutes." },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const config = RoadmapConfigSchema.parse(await parseJson(req));
  const profile = await getProfile(session.id);
  if (!profile) {
    return NextResponse.json({ error: "Complete the intake first." }, { status: 412 });
  }

  const doc = await generateRoadmap(profile, config);
  await saveRoadmapV2(session.id, doc);
  return ok({ doc });
});

export const DELETE = withErrorHandling(async () => {
  const session = await requireSession();
  await deleteRoadmapV2(session.id);
  return ok({ doc: null });
});
