# Plan & feature verification notes

The plan catalog (`lib/billing/plans.ts`) is the single source of truth for
prices, feature promises, and limits. The feature-access map
(`lib/features.ts` → `FEATURE_ACCESS`) is the single source of truth for
gating. This document records the audit that aligned both with what the app
actually does, plus the manual test checklist.

## Where each surface gets its plan data

| Surface | Source |
| --- | --- |
| Landing pricing (`components/landing/PricingSection.tsx`) | `PLAN_CATALOG` (prices, features, featuresBn, comingSoon) |
| `/billing` cards (`components/app/BillingClient.tsx`) | `PLAN_CATALOG` |
| Checkout + receipts (`/api/transactions/*`) | `planPrice` / `planDescription` |
| Strategist rate limits (`lib/ratelimit.ts` BUDGETS) | mirrors `PLAN_CATALOG[..].limits.strategistPer5Min` (10/30/60) |
| Feature gates (`requirePlan`, `canUse`) | `FEATURE_ACCESS` / `planMeets` |
| Sidebar lock badges (`LeftNav` via `lib/nav.ts` `minPlan`) | aligned with the same gates |
| Plan badges (TopBar, LeftNav, Nav) | `session.user.plan` + `PLAN_LABELS` |

## Feature-by-feature audit (2026-06-11)

### Free
| Promise | Status | Where |
| --- | --- | --- |
| University & scholarship directory | WORKS — `/universities` gate relaxed from `requirePlan("pro")` to `requireSession`; scholarships in `/resources` (never gated) | `app/(app)/universities/page.tsx` |
| Acceptance-rate benchmarks | WORKS — `/api/benchmark` relaxed to `requireSession`; acceptance data shown on university cards/detail | `app/api/benchmark/route.ts` |
| Public requirement summaries | WORKS — university detail modal (requirements, test policy, deadlines) | `UniversitiesClient` |
| Community resources & knowledge hub | WORKS — `/resources` has no plan gate | `app/(app)/resources/page.tsx` |
| 1 active roadmap with weekly tasks & replans | WORKS — roadmap v2 generate/adapt are session-gated only (one living doc per user); rate-limited | `/api/roadmap/v2`, `/api/roadmap/v2/adapt` |
| Strategist — 10 messages / 5 min | WORKS — `BUDGETS.free = 10` | `lib/ratelimit.ts` |
| Deadline tracking & family view | WORKS — `/deadlines`, `/family` ungated | — |

### Pro
| Promise | Status | Where |
| --- | --- | --- |
| 3× Strategist budget (30 / 5 min) | WORKS — `BUDGETS.pro = 30` | `lib/ratelimit.ts` |
| Integration hub | WORKS — `/connections` is `requirePlan("pro")`; real Codeforces/GitHub imports | `app/(app)/connections/page.tsx` |
| Partner marketplace | WORKS — `/partners` is `requirePlan("pro")` | `app/(app)/partners/page.tsx` |
| Up to 6 connected tools | WORKS — `PLAN_FEATURES.pro.maxConnections = 6` (derived from catalog) | `lib/features.ts` |

### Elite
| Promise | Status | Where |
| --- | --- | --- |
| 6× Strategist budget (60 / 5 min) | WORKS — `BUDGETS.elite = 60` | `lib/ratelimit.ts` |
| Unlimited tool connections | WORKS — cap 99 | `lib/features.ts` |
| Deep benchmarking vs admitted profiles | NOT BUILT → listed under `comingSoon`, renders with "Soon" tag | catalog |
| Faculty & recommender lists | NOT BUILT → `comingSoon` | catalog |
| Priority Bangla support | NOT BUILT → `comingSoon` | catalog |

### Removed claims (previously advertised, not true)
- "Unlimited roadmaps" (Pro) — the v2 engine keeps one living roadmap per
  user for every plan. Replaced with honest limits.
- "Probability engine" as Pro-only — fit bands on `/universities` are now
  Free along with the directory.
- Landing's old Pro $19 / Elite $49 — checkout actually charges $5 / $15
  monthly ($49 / $149 yearly). Landing now renders catalog prices.
- "Priority Strategist queue", "Advanced analytics & streak insights"
  (Elite) — no implementation; dropped (streaks are free for everyone).

## Manual test checklist

1. **Free user** — sign up fresh → can open `/universities` (directory, fit
   rings, compare, detail requirements), `/resources`, `/deadlines`,
   `/family`; generate + replan roadmap; Strategist stops at ~10 messages in
   5 min with the quota modal. `/connections` and `/partners` redirect to
   `/billing` (requirePlan). Sidebar shows lock badges only on Connections
   and Partners. Plan badge everywhere says "Free".
2. **Pro user** (set `plan: "pro"` on the user in Mongo or via admin) —
   everything in Free, plus `/connections` and `/partners` open; Strategist
   budget 30; billing hero shows "Pro", its card shows "Your plan", Free
   card button says "Included"-style passive state, Elite shows
   "Upgrade to Elite".
3. **Elite user** — budget 60; both Pro pages open; Elite card active;
   Pro card button reads "Switch to Pro" (downgrade-style action).
4. **Downgrade** — cancel subscription in `/billing` → renews-until state
   shows; after period ends (or manual plan flip) gated pages bounce again.
5. **Cycle toggle** — landing and `/billing`: monthly shows $5/$15,
   yearly shows $49/$149 with the "2 months free" badge; prices animate.
6. **Coming soon** — Elite card (both surfaces) renders the three unbuilt
   promises with a clock icon + "Soon" chip, never as a checked benefit.
