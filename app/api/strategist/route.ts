/**
 * POST /api/strategist
 *
 * Streams a Strategist response over Server-Sent Events. Requires a
 * signed-in user and respects per-plan rate limits.
 *
 * Body: see `StrategistRequestSchema` — accepts optional mode, model,
 * autoSelect, offline, allowPaid params.
 * Response: `text/event-stream` with `StrategistChunk` events.
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireSession } from "@/lib/authz";
import { HttpError, parseJson } from "@/lib/api/respond";
import { rateLimit, rateLimitHeaders } from "@/lib/ratelimit";
import { StrategistRequestSchema } from "@/lib/strategist/schemas";
import { sseHeaders, strategistStream } from "@/lib/strategist/stream";
import { getProfile, getLatestRoadmap, getRoadmapV2 } from "@/lib/db/collections";
import { roadmapContextLines } from "@/lib/roadmap/generate";
import { integrationContextLines } from "@/lib/integrations/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireSession();

    const rl = await rateLimit(user.id, user.plan, "strategist");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached. Slow down for a few minutes." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const body = StrategistRequestSchema.parse(await parseJson(req));

    const [profile, roadmap, roadmapV2, integrationLines] = await Promise.all([
      getProfile(user.id),
      getLatestRoadmap(user.id),
      getRoadmapV2(user.id).catch(() => null),
      integrationContextLines(user.id).catch(() => []),
    ]);
    if (!profile) {
      return NextResponse.json({ error: "Complete the intake first." }, { status: 412 });
    }

    // The SAME roadmap doc that renders the tree feeds the Strategist:
    // config, branch focus nodes, recent scores, last adaptation. When the
    // tree changes (task ticked, score entered, replan) the next message
    // already reflects it — the two surfaces can't drift.
    const recentMilestones = roadmapV2
      ? roadmapContextLines(roadmapV2)
      : roadmap?.roadmap.milestones
          .slice(0, 6)
          .map((m) => `${m.title} — ${m.status} — priority ${m.priority}`) ?? [];

    // Live client context: the node the user is focused on right now + the
    // last few roadmap events. The Strategist must answer about THAT node
    // without re-asking for details the roadmap already holds.
    if (roadmapV2 && body.roadmapContext?.selectedNodeId) {
      const node = roadmapV2.branches
        .flatMap((b) => b.nodes.map((n) => ({ n, b })))
        .find(({ n }) => n.id === body.roadmapContext!.selectedNodeId);
      if (node) {
        recentMilestones.push(
          `USER'S SELECTED NODE (answer about this without re-asking): "${node.n.title}" [${node.b.category}] — status ${node.n.status}, progress ${node.n.progress}%, priority ${node.n.priority}, ~${node.n.estimatedHoursPerWeek}h/wk. Do: ${node.n.description} How: ${node.n.how.slice(0, 220)} Done when: ${node.n.completionCriteria}`,
        );
      }
    }
    if (body.roadmapContext?.recentEvents?.length) {
      recentMilestones.push(
        `RECENT ROADMAP EVENTS: ${body.roadmapContext.recentEvents.slice(-8).join(" · ")}`,
      );
    }
    // Connected-tool insights (GitHub portfolio health, Codeforces weak tags…)
    recentMilestones.push(...integrationLines);

    const stream = strategistStream({
      userId: user.id,
      profile,
      recentMilestones,
      userMessage: body.message,
      mode: body.mode,
      preferred: body.model,
      autoSelect: body.autoSelect,
      offline: body.offline,
      allowPaid: body.allowPaid,
      abortSignal: req.signal,
    });

    return new Response(stream, { headers: { ...sseHeaders(), ...rateLimitHeaders(rl) } });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[strategist] route error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
