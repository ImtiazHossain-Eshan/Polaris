/**
 * /consultants — verified consultant marketplace. Open to EVERY plan:
 * free users can browse, match, and book exactly like Pro/Elite. The
 * server assembles real availability, real review aggregates, and the
 * explainable matches from the student's roadmap/deadline state.
 */

import { requireSession } from "@/lib/authz";
import { getProfile, getRoadmapV2 } from "@/lib/db/collections";
import { listDeadlines } from "@/lib/deadlines/service";
import {
  ensureConsultantsSeeded, listConsultants, ratingSummaries, availableSlots, freeSessionEligible,
} from "@/lib/consultants/service";
import { matchConsultants } from "@/lib/consultants/matching";
import { ConsultantsClient, type ConsultantView } from "@/components/app/ConsultantsClient";

export const dynamic = "force-dynamic";

export default async function ConsultantsPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const user = await requireSession();
  const { open } = await searchParams;

  await ensureConsultantsSeeded();
  const [consultants, ratings, profile, roadmap, deadlines] = await Promise.all([
    listConsultants(),
    ratingSummaries(),
    getProfile(user.id),
    getRoadmapV2(user.id).catch(() => null),
    listDeadlines(user.id).catch(() => []),
  ]);

  const soon = Date.now() + 45 * 24 * 3600 * 1000;
  const upcoming = (deadlines as Array<{ title?: string; dueAt?: string }>)
    .filter((d) => d.dueAt && new Date(d.dueAt).getTime() < soon)
    .map((d) => d.title ?? "")
    .filter(Boolean);

  const matches = matchConsultants(
    { profile, roadmap, upcomingDeadlines: upcoming },
    consultants,
  );

  const views: ConsultantView[] = await Promise.all(
    consultants.map(async (c) => ({
      id: c.id,
      name: c.name,
      headline: c.headline,
      bio: c.bio,
      countries: c.countries,
      background: c.background,
      services: c.services,
      languages: c.languages,
      types: c.types,
      priceMinor: c.priceMinor,
      sessionMinutes: c.sessionMinutes,
      freeFirstSession: c.freeFirstSession,
      verification: c.verification,
      responseHours: c.responseHours,
      studentsGuided: c.studentsGuided,
      avatarTone: c.avatarTone,
      rating: ratings[c.id] ?? null,
      slots: c.verification === "verified" || c.verification === "featured" ? await availableSlots(c) : [],
      freeSessionEligible: await freeSessionEligible(user.id, c),
    })),
  );

  return (
    <ConsultantsClient
      consultants={views}
      matches={matches}
      initialOpenId={open ?? null}
    />
  );
}
