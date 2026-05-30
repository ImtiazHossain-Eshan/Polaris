# Polaris — AI Academic Strategist

> **The Infinity AI BuildFest 2026 submission.** A fully autonomous AI academic strategist that reverse-engineers competitive university-admission profiles for students — from early schooling to graduate school.

Polaris is an AI-native platform that replaces fragmented Reddit threads and $2,000+ consultants with a transparent, data-driven roadmap.

## What's inside

| Layer | Stack |
| --- | --- |
| Frontend | Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS |
| LLM | Google Gemini 2.0 Flash with **structured-JSON output** (responseSchema) |
| Retrieval | RAG over a curated 60-doc KB (universities, scholarships, accepted-student case studies) using Gemini `text-embedding-004` + in-memory cosine search |
| ML | Logistic-regression acceptance-probability model with **transparent factor weights** — no demographic proxies |
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

## Tiers (pricing page reflects this)

- **Free** — public directory of universities, scholarships, acceptance benchmarks.
- **Polaris Pro** — AI roadmap, probability engine, case-study matching, gap analysis, smart reminders.
- **Polaris Elite** — adaptive replanning, deep benchmarking, scenario reports, curated professor lists, parent / partner dashboards, priority Bangla support.

## Built for

[The Infinity AI BuildFest 2026](https://www.infinityaibuildfest.com).
