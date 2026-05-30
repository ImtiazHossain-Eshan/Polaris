import type { StudentProfile } from "./profile";
import type { RoadmapResponse, RoadmapMilestone } from "./llm/gemini";

/**
 * Deterministic roadmap built from heuristics + curated KB.
 * Used as a fallback if no Gemini key is configured, so the demo flow
 * still works end-to-end without an API call.
 */
export function buildFallbackRoadmap(profile: StudentProfile, retrievedTitles: string[]): RoadmapResponse {
  const eliteUni = retrievedTitles[0] || "MIT";
  const isEarly = profile.grade === "middle" || profile.grade === "early-hs";
  const isLate = profile.grade === "late-hs" || profile.grade === "recent-grad";
  const wantsTop = profile.targetTier === "elite" || profile.targetTier === "top50";

  const milestones: RoadmapMilestone[] = [
    {
      quarter: "Months 1–3",
      category: "Academics",
      title: profile.gpa < 3.85 ? "Push GPA toward 3.9+" : "Lock in academic ceiling",
      description:
        profile.gpa < 3.85
          ? "Identify the two subjects dragging GPA down and build weekly office-hour + tutor + practice-test routines."
          : "Maintain top-decile performance and start enriching with AP / A-level depth.",
      priority: profile.gpa < 3.85 ? "high" : "medium",
      rationale: `${eliteUni} and similar tier-1 universities expect a 3.9+ unweighted GPA from international applicants.`,
      metric: "Term GPA ≥ 3.9 / 4.0",
    },
    {
      quarter: "Months 1–3",
      category: "Testing",
      title: wantsTop ? "Diagnostic SAT + IELTS" : "Pick the right testing path",
      description:
        "Sit a full diagnostic SAT and a mock IELTS. Use scores to choose between SAT-heavy or A-level-heavy strategy.",
      priority: "high",
      rationale: "Tier-1 admissions decisions still weight standardized testing heavily for international applicants.",
      metric: "Diagnostic baseline recorded",
    },
    {
      quarter: "Months 3–6",
      category: "Extracurriculars",
      title: profile.ecs.includes("Research") ? "Convert research into a publishable result" : "Start a research project",
      description: profile.ecs.includes("Research")
        ? "Aim for a workshop submission or preprint by month 9. Find a co-author through a local university or online program."
        : "Reach out to a BUET / DU / local university faculty member for a 6-month independent project.",
      priority: "high",
      rationale: "Case studies of admits to tier-1 universities consistently show original research or publication signals.",
      metric: "1 workshop / preprint / poster submission",
    },
    {
      quarter: "Months 3–6",
      category: "Skills",
      title: "Ship a real-world product or tool",
      description:
        "Build something used by 100+ real people. Open-source it, document it, and link from your portfolio.",
      priority: "medium",
      rationale: "Founder-mindset and shipping signal differentiates well-rounded applicants in elite admissions.",
      metric: "Tool with 100+ active users",
    },
    {
      quarter: "Months 6–9",
      category: "Extracurriculars",
      title: "Compete at the highest reachable tier",
      description:
        "Target one Olympiad / hackathon / debate event at the highest tier you can realistically reach. Train weekly.",
      priority: "high",
      rationale: "Successful case studies show Olympiad medals or top contest finishes as a primary differentiator.",
      metric: "1 national-level placement",
    },
    {
      quarter: "Months 6–9",
      category: "Testing",
      title: "Sit official SAT / IELTS / subject test",
      description:
        "Take the real exam after consistent prep. Reserve a retake slot 6–8 weeks later.",
      priority: "high",
      rationale: "Two attempts maximize your superscore and protect against bad-day variance.",
      metric: wantsTop ? "SAT 1500+ / IELTS 7.5+" : "SAT 1400+ / IELTS 7+",
    },
    {
      quarter: "Months 9–12",
      category: "Applications",
      title: "Lock in 6–8 target universities",
      description:
        "Mix 2 reach, 3 target, 2 safety. Use the Polaris probability engine to calibrate.",
      priority: "medium",
      rationale: "A balanced list maximizes expected acceptance value, not just probability.",
      metric: "Finalized university list with rationale per school",
    },
    {
      quarter: "Months 9–12",
      category: "Applications",
      title: "First-draft personal essays",
      description:
        "Draft 1 Common-App-style essay + 2 supplements. Get feedback from 2 reviewers.",
      priority: "medium",
      rationale: "Essays are the highest-leverage application component because they cannot be retroactively improved.",
      metric: "3 essays at v2 draft",
    },
    {
      quarter: "Months 12–18",
      category: isLate ? "Applications" : "Skills",
      title: isLate ? "Submit applications + scholarships" : "Deepen one technical specialty",
      description: isLate
        ? "Apply EA/ED to top choice. Apply to 2 full-funding scholarships in parallel (e.g. Yale need-blind, NUS ASEAN)."
        : "Pick one technical area (ML, systems, biology, etc.) and reach undergraduate-textbook depth.",
      priority: "high",
      rationale: isLate
        ? "EA / ED rounds typically have 2–3x acceptance rates."
        : "Depth in one area beats breadth across many for elite admissions.",
      metric: isLate ? "Applications submitted" : "1 textbook completed + project shipped",
    },
  ];

  if (isEarly) {
    milestones.unshift({
      quarter: "Months 1–3",
      category: "Skills",
      title: "Build a learning system, not just grades",
      description:
        "Establish daily reading + weekly project habit. Pick one technical or creative interest to go deep on for the next 3 years.",
      priority: "high",
      rationale: "Middle and early-high-school students who build sustained habits compound over 4–6 years before applications.",
      metric: "Daily 60-min focused work logged for 8+ weeks",
    });
  }

  const gaps: string[] = [];
  if (profile.gpa < 3.9) gaps.push("Academic ceiling: successful admits typically had 3.9+ unweighted.");
  if (!profile.ecs.includes("Research")) gaps.push("No research signal — case studies show original work as a frequent differentiator.");
  if (!profile.ecs.includes("Olympiads")) gaps.push("No Olympiad / national competition — high-leverage differentiator for STEM.");
  if (!profile.ecs.includes("Leadership")) gaps.push("Limited leadership signal — scholarships like Rhodes / Chevening weight this heavily.");
  if (profile.ecs.length < 2) gaps.push("Narrow extracurricular footprint — aim for depth in 2 categories, not breadth across all six.");

  return {
    summary: `Over the next 6–18 months, focus on translating your current ${
      profile.targetTier === "elite" ? "strong" : "solid"
    } baseline into a competitive ${
      profile.targetTier === "elite" ? "tier-1 global" : "internationally strong"
    } application profile. The highest-leverage moves: standardized-test discipline, one deep ${
      profile.ecs.includes("Research") ? "research output" : "research or shipped-product project"
    }, and one national-level competition or distinction.`,
    gaps: gaps.slice(0, 5),
    milestones,
  };
}
