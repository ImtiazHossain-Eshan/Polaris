/**
 * /strategist — full-canvas Strategist. Streams the real /api/strategist SSE
 * endpoint (with citations) via StrategistClient; the context strip + gap table
 * are derived from the student's real profile + the probability engine.
 */

import { requireSession } from "@/lib/authz";
import { getProfile, getUserById } from "@/lib/db/collections";
import { scoreProbability, profileToInputs, type UniversityForModel } from "@/lib/ml/probability";
import { planMeets } from "@/lib/features";
import { StrategistClient, type GapRow } from "@/components/app/StrategistClient";
import { StrategistLockedPage } from "@/components/app/StrategistLocked";

export const dynamic = "force-dynamic";

const TARGET: Record<string, { tier: UniversityForModel["tier"]; rate: number; label: string }> = {
  elite: { tier: "elite", rate: 0.05, label: "Elite-tier" },
  top50: { tier: "top50", rate: 0.18, label: "Top-50" },
  top200: { tier: "top200", rate: 0.35, label: "Top-200" },
  regional: { tier: "regional", rate: 0.6, label: "Regional" },
};

export default async function StrategistPage() {
  const user = await requireSession();

  // The AI Strategist is Pro/Elite — Free users get the upgrade screen,
  // never a degraded chat (the API enforces the same gate).
  if (!planMeets(user.plan, "pro")) {
    return <StrategistLockedPage />;
  }

  const [profile, u] = await Promise.all([getProfile(user.id), getUserById(user.id)]);

  const inputs = profileToInputs(profile);
  const target = TARGET[profile?.targetTier ?? "elite"] ?? TARGET.elite;
  const probPct = Math.round(scoreProbability(inputs, { id: "t", tier: target.tier, acceptanceRate: target.rate }).probability * 100);

  const name = u?.name ?? "Student";
  const initials = name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "P";

  const contextRows = [
    { k: "GPA", v: inputs.gpa.toFixed(2) },
    { k: "Target", v: target.label },
    { k: "Probability", v: `${probPct}%` },
    { k: "Country", v: profile?.country ?? "—" },
  ];

  const gapRows: GapRow[] = [
    { signal: "GPA / academic ceiling", you: inputs.gpa.toFixed(2), admit: "3.90", move: inputs.gpa < 3.9 ? "Lift toward a 3.9+ ceiling" : "Maintain the ceiling" },
    { signal: "Standardized testing", you: `${inputs.testPercentile}%ile`, admit: "95%ile", move: inputs.testPercentile < 95 ? "Structured prep → higher percentile" : "Hold" },
    { signal: "Strong extracurriculars", you: String(inputs.ecCount), admit: "7", move: inputs.ecCount < 7 ? "Deepen 1–2 sustained activities" : "Hold depth" },
    { signal: "Original research / shipped work", you: String(inputs.research), admit: "6", move: inputs.research < 6 ? "Land a research seat or ship a project" : "Keep shipping" },
  ];

  return (
    <StrategistClient
      studentName={name}
      initials={initials}
      grade={profile?.grade ?? ""}
      contextRows={contextRows}
      gapRows={gapRows}
      eyebrow={`Strategist · grounded · ${target.label} target`}
    />
  );
}
