/**
 * Polaris plan catalog — the single source of truth for pricing.
 *
 * Client-safe (no server imports). Amounts are minor units: USD cents and
 * BDT paisa. Yearly pricing = 10 months (two free). Feature lists mirror the
 * real plan gates (`requirePlan`) across the app — don't list features that
 * don't exist.
 */

export type PlanId = "free" | "pro" | "elite";
export type BillingCycle = "monthly" | "yearly";

export type PlanDef = {
  id: PlanId;
  name: string;
  tagline: string;
  audience: string;
  usd: { monthly: number; yearly: number };
  bdt: { monthly: number; yearly: number };
  features: string[];
  popular?: boolean;
  accent: "ink" | "polaris" | "aurora";
};

export const PLAN_CATALOG: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Start your journey",
    audience: "For exploring what Polaris can do",
    usd: { monthly: 0, yearly: 0 },
    bdt: { monthly: 0, yearly: 0 },
    features: [
      "1 active roadmap with weekly tasks",
      "Strategist — 10 messages / 5 min",
      "Deadline tracking & family view",
      "Core resource library",
    ],
    accent: "ink",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "The full intelligence layer",
    audience: "For students actively building their application",
    usd: { monthly: 500, yearly: 4900 },     // $5 / $49
    bdt: { monthly: 55000, yearly: 549000 }, // ৳550 / ৳5,490
    features: [
      "Unlimited roadmaps + dynamic replans",
      "Full Strategist sync & score analysis",
      "Universities with fit bands + compare",
      "Integration hub (GitHub, Codeforces…)",
      "Partner marketplace & knowledge hub",
      "Probability engine",
    ],
    popular: true,
    accent: "polaris",
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "Every edge, prioritized",
    audience: "For applicants targeting the most selective schools",
    usd: { monthly: 1500, yearly: 14900 },     // $15 / $149
    bdt: { monthly: 169000, yearly: 1690000 }, // ৳1,690 / ৳16,900
    features: [
      "Everything in Pro",
      "Deep benchmarking vs admitted profiles",
      "Faculty + recommender lists",
      "Priority Strategist queue",
      "Advanced analytics & streak insights",
    ],
    accent: "aurora",
  },
];

export function planDef(id: PlanId): PlanDef {
  return PLAN_CATALOG.find((p) => p.id === id) ?? PLAN_CATALOG[0];
}

export function planPrice(id: PlanId, cycle: BillingCycle): { usd: number; bdt: number } {
  const p = planDef(id);
  return { usd: p.usd[cycle], bdt: p.bdt[cycle] };
}

export function formatMinor(minor: number, currency: string): string {
  const v = minor / 100;
  if (currency === "BDT") return `৳${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/** "Polaris Pro (yearly)" — parsed back by the confirm route. */
export function planDescription(id: Exclude<PlanId, "free">, cycle: BillingCycle): string {
  return `Polaris ${id === "pro" ? "Pro" : "Elite"} (${cycle})`;
}

export function parsePlanDescription(desc: string): { planId: Exclude<PlanId, "free">; cycle: BillingCycle } | null {
  const m = /^polaris (pro|elite) \((monthly|yearly|annual)\)/i.exec(desc.trim());
  if (!m) return null;
  return {
    planId: m[1].toLowerCase() as "pro" | "elite",
    cycle: m[2].toLowerCase() === "monthly" ? "monthly" : "yearly",
  };
}
