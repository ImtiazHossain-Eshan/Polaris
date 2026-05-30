export type GradeLevel =
  | "middle"
  | "early-hs"
  | "late-hs"
  | "undergrad"
  | "recent-grad";

export type Country =
  | "Bangladesh"
  | "India"
  | "Pakistan"
  | "Nepal"
  | "Other South Asia"
  | "Other";

export type Degree = "undergrad" | "masters" | "phd" | "undecided";

export type ECCategory =
  | "Olympiads"
  | "Research"
  | "Leadership"
  | "Community"
  | "Sports/Arts"
  | "Internships";

export type Tier = "elite" | "top50" | "top200" | "regional";

export type StudentProfile = {
  grade: GradeLevel;
  country: Country;
  degree: Degree;
  gpa: number; // 0–4.0
  ecs: ECCategory[];
  targetTier: Tier;
  // Optional probability-engine sliders (default from profile)
  testPercentile?: number; // 0–100
  ecCount?: number; // 0–10
  research?: number; // 0–10
};

export const PROFILE_KEY = "polaris.profile";
export const ROADMAP_KEY = "polaris.roadmap";

export function summarizeProfile(p: StudentProfile): string {
  const gradeMap: Record<GradeLevel, string> = {
    middle: "middle school",
    "early-hs": "early high school",
    "late-hs": "late high school (11–12)",
    undergrad: "undergraduate",
    "recent-grad": "recent graduate",
  };
  const degreeMap: Record<Degree, string> = {
    undergrad: "undergraduate (bachelor's)",
    masters: "master's",
    phd: "PhD",
    undecided: "still deciding",
  };
  const tierMap: Record<Tier, string> = {
    elite: "top global (Ivy / Oxbridge / MIT-tier)",
    top50: "top 50 global",
    top200: "strong international (top 200)",
    regional: "regional strong programs",
  };
  return [
    `Student is in ${gradeMap[p.grade]} in ${p.country}.`,
    `Targeting ${degreeMap[p.degree]} at ${tierMap[p.targetTier]} institutions.`,
    `Current academic standing: GPA ${p.gpa.toFixed(2)} / 4.0.`,
    `Current extracurricular categories: ${
      p.ecs.length ? p.ecs.join(", ") : "none reported yet"
    }.`,
  ].join(" ");
}
