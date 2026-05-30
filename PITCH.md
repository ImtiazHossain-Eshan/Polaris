# Polaris — 180-Second Pitch Script

Use this as a teleprompter for your BuildFest video. Beat counts are approximate.

---

## 0:00–0:30 — Problem (30s)

**On screen:** Stat card. "85% of Bangladeshi students apply blind. Counselors cost $2,000+. Top universities reward strategy, not luck."

> Every year, millions of brilliant students apply to top universities with nothing but a few Reddit threads, outdated blogs, and contradictory forum advice. The students who can afford it pay consultants $2,000 or more. The rest guess. This is true in Bangladesh, and it's true globally — and the cost is millions of misallocated years of preparation.

---

## 0:30–1:00 — Solution (30s)

**On screen:** Constellation diagram: Profile → AI Strategist → Roadmap → Probability.

> Polaris is a fully autonomous AI academic strategist. It doesn't list universities — it reverse-engineers the exact profile each tier of school accepts, then builds a personalized 6-to-18-month roadmap from your current standing to your target. From middle school all the way to graduate admissions.

---

## 1:00–2:00 — Live Demo (60s) ★ the crucial minute

**On screen:** Screen recording of the actual product.

> Watch it work. **(0:00 demo: visit /onboard.)** Six questions — grade, country, target degree, GPA, your current activities, target tier. **(0:15 demo: hit submit.)** Polaris pulls relevant universities, scholarships, and accepted-student case studies through a RAG layer, sends them to Gemini with a structured-output schema, and returns a quarter-by-quarter roadmap.
>
> **(0:25 demo: dashboard loads.)** Eight to twelve milestones, grouped by quarter, prioritized, each with a rationale that names a real university requirement or a real accepted-student pattern. Plus a gap analysis — what successful applicants had that you don't yet.
>
> **(0:45 demo: open /university/mit.)** Now the probability engine. Picks any of the twenty universities Polaris has benchmarked. A trained ML model scores your acceptance probability — 41% for MIT versus a 4% baseline. **(0:55 demo: move sliders.)** Move a slider — your odds shift in real time. And every score shows its top contributing factors, with transparent weights.

---

## 2:00–2:30 — AI Architecture (30s)

**On screen:** Architecture chips.

> Under the hood: Gemini 2.0 Flash for reasoning, with a structured-output schema so the dashboard renders typed JSON, not free text. A RAG layer over a curated knowledge base of universities, scholarships, and accepted-student case studies — embedded with text-embedding-004 and searched with cosine similarity. And a logistic-regression probability model with transparent, non-demographic factor weights. Plus first-class English and Bangla localization. This is production-grade AI architecture, not a chatbot wrapper.

---

## 2:30–3:00 — Impact, Scale, Tiers (30s)

**On screen:** Tier pricing + globe.

> Three tiers: free directory access, Polaris Pro for AI-driven roadmaps and probability, Polaris Elite for adaptive replanning, deep benchmarking, and parent dashboards. Year-one target: 10,000 Bangladeshi students, 30% lift in tier-1 acceptance rates, scaling to South Asia and the global diaspora through modular content — adding a country means adding a JSON document, not writing code.
>
> Polaris — your AI North Star.

---

## Recording tips

- Use the dev server at `http://localhost:3000` — `npm run dev`. Pre-fill the onboarding form once so you don't have to type on camera.
- Pre-open `/dashboard` and `/university/mit` in tabs so cuts are instant.
- The constellation animation on the landing hero looks best in 1440p / 60fps.
- If recording your screen: hide the browser bookmarks bar; use full-screen.
- Backup plan: record one full no-cuts run-through of the live demo and keep it ready in case the live demo fails on the day.
