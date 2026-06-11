/**
 * /roadmap — the roadmap v2 tree / skill-map.
 *
 * Server resolves the default education level from the student's profile
 * grade; the client fetches the live roadmap doc (or runs the setup flow),
 * renders the tree, and keeps the Strategist in sync — both read the same
 * /api/roadmap/v2 document.
 */

import { requireSession } from "@/lib/authz";
import { getProfile } from "@/lib/db/collections";
import type { EducationLevel } from "@/lib/roadmap/types";
import { RoadmapPageClient } from "@/components/roadmap/RoadmapPageClient";

export const dynamic = "force-dynamic";

const GRADE_TO_LEVEL: Record<string, EducationLevel> = {
  "middle": "middle-school",
  "early-hs": "ssc",
  "late-hs": "hsc",
  "undergrad": "gap-applicant",
  "recent-grad": "gap-applicant",
};

export default async function RoadmapPage() {
  const user = await requireSession();
  const profile = await getProfile(user.id);
  const defaultLevel = GRADE_TO_LEVEL[profile?.grade ?? "late-hs"] ?? "hsc";
  return <RoadmapPageClient defaultLevel={defaultLevel} />;
}
