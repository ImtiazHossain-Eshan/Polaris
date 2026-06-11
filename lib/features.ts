import type { Plan } from "@/lib/db/collections";

/**
 * Client-safe plan/feature logic. No server-only imports (no env, no db),
 * so this can be used in both client components and server code.
 */

export type Feature =
  | "roadmap"
  | "milestones"
  | "benchmark"
  | "caseStudyDetail"
  | "adaptiveReplanning"
  | "professorLists"
  | "analytics"
  | "strategyReport"
  | "scenarioSim";

export const FEATURE_MIN_PLAN: Record<Feature, Plan> = {
  roadmap: "pro",
  milestones: "pro",
  benchmark: "pro",
  caseStudyDetail: "pro",
  adaptiveReplanning: "elite",
  professorLists: "elite",
  analytics: "elite",
  strategyReport: "elite",
  scenarioSim: "elite",
};

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, elite: 2 };

export function planMeets(plan: Plan, minPlan: Plan): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[minPlan];
}

export function canUse(plan: Plan, feature: Feature): boolean {
  return planMeets(plan, FEATURE_MIN_PLAN[feature]);
}

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  elite: "Elite",
};

/**
 * Per-plan quotas for the new app shell (Strategist message budget per
 * 5-min window, connection limits, gated surfaces). Pure data — safe on
 * client + server. Mirrored server-side by lib/ratelimit.ts + requirePlan.
 */
export const PLAN_FEATURES: Record<
  Plan,
  {
    strategistBudget: number;
    maxConnections: number;
    universities: boolean;
    familyMonitoring: boolean;
  }
> = {
  free: { strategistBudget: 10, maxConnections: 0, universities: false, familyMonitoring: true },
  pro: { strategistBudget: 30, maxConnections: 6, universities: true, familyMonitoring: true },
  elite: { strategistBudget: 60, maxConnections: 99, universities: true, familyMonitoring: true },
};
