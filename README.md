# Polaris — AI Academic Strategist

> **The Infinity AI BuildFest 2026 submission.** A fully autonomous AI academic strategist that reverse-engineers competitive university-admission profiles for students — from early schooling to graduate school.

Polaris is an AI-native platform that replaces fragmented Reddit threads and $2,000+ consultants with a transparent, data-driven roadmap.

## What's inside

| Layer | Stack |
| --- | --- |
| Frontend | Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS |
| Auth | NextAuth v4 (JWT) · credentials · bcrypt · MongoDB Atlas |
| Roles & plans | RBAC (student / parent / partner / admin) · Free / Pro / Elite tiers with server + client feature gating |
| Payments | LemonSqueezy (merchant-of-record) — hosted checkout, customer portal, signed webhooks |
| LLM | Google Gemini 2.0 Flash with **structured-JSON output** (responseSchema) |
| Retrieval | RAG over a curated 60-doc KB (universities, scholarships, accepted-student case studies) using Gemini embeddings + in-memory cosine search |
| ML | Logistic-regression acceptance-probability model with **transparent factor weights** — no demographic proxies |
| Hardening | Zod validation · centralized API error handling · MongoDB indexes · env validation · security headers |
| Localization | English / বাংলা |
| Fallback | Deterministic heuristic engine — the demo works even with no API key |

## Demo flow (the vertical slice)

1. **Landing** (`/`) — problem framing, 3-tier pricing, AI-architecture chips.
2. **Intake** (`/onboard`) — 6 questions captures grade, country, degree, GPA, ECs, target tier.
3. **AI Strategist** (`/api/roadmap`) — RAG over the KB + Gemini structured-JSON returns 8–12 milestones grouped by quarter, with rationale grounded in real KB docs.
4. **Dashboard** (`/dashboard`) — strategic summary, "what successful applicants had that you don't yet", quarter-grouped milestones, next-30-days focus card.
5. **Probability Engine** (`/university` + `/university/[id]`) — picks a target university from a curated list of 20, scores acceptance probability, shows the top-contributing factors with weights, and lets you simulate "what if I add X" with live sliders.

## Run locally

```bash
npm install
cp .env.local.example .env.local
# (optional but recommended) drop your free Gemini key into .env.local
npm run embeddings   # one-off: builds data/embeddings.json (skips silently with no key — keyword fallback kicks in)
npm run dev          # http://localhost:3000
```

Without a Gemini key Polaris transparently degrades to (a) keyword-overlap retrieval and (b) the heuristic roadmap engine — so the full demo flow is verifiable offline.

## Architecture decisions worth flagging for judges

- **Structured-output LLM tool-use** — not a chatbot wrapper. Gemini returns typed JSON conforming to a `responseSchema`, so the dashboard can render confidently.
- **No vector DB** — ~60 docs × 768 dims live in `data/embeddings.json`; cosine search runs in pure TS. Zero infra, deterministic, fast enough.
- **Transparent ML** — every probability shows top-3 contributing factors and their weights. Ethical-AI by design — no demographic features.
- **Modular RAG** — adding a country = adding a JSON doc + re-running `npm run embeddings`. The architecture scales globally without code changes.

## Accounts, plans & B2B2C

Polaris is account-based with role-aware access:

- **Roles** — `student` (default), `parent`, `partner`, `admin`. Chosen at sign-up; parents/partners get a **read-only** monitoring dashboard (`/monitor`).
- **Plans** — `free` / `pro` / `elite`, enforced both server-side (`requirePlan` in `lib/authz.ts`) and client-side (`usePlan` / `canUse` in `lib/features.ts`). The feature→tier map lives in `lib/features.ts`.
- **Parent/partner linking** — a student invites someone by email from `/family`; the invitee accepts via a token and then sees progress (read-only) at `/monitor`.

### Feature gating

| Feature | Min plan |
| --- | --- |
| University/scholarship directory, acceptance rates, probability teaser, case-study titles | Free |
| AI roadmap generation, milestone tracking, benchmarking, full case studies | Pro |
| Adaptive replanning, professor lists, analytics, strategy reports, scenario sims | Elite |

### Payments (LemonSqueezy)

Subscriptions are handled by LemonSqueezy (works for Bangladesh-based payouts as a merchant-of-record):

1. Create a store + two subscription products ("Polaris Pro", "Polaris Elite") at [lemonsqueezy.com](https://app.lemonsqueezy.com).
2. Copy each **variant id** and create an API key.
3. Add a webhook → `<domain>/api/webhooks/lemonsqueezy` (all `subscription_*` events) and copy the signing secret.
4. Fill the `LEMONSQUEEZY_*` vars in `.env.local` (see `.env.local.example`).

Checkout (`/api/checkout`) launches a hosted checkout; the signed webhook (`/api/webhooks/lemonsqueezy`) flips the user's `plan`; `/billing` opens the customer portal. With LemonSqueezy unset, paid CTAs degrade gracefully and the Free tier still works end-to-end.

## Built for

[The Infinity AI BuildFest 2026](https://www.infinityaibuildfest.com).
