# Migration notes — Polaris app shell merge

This documents the merge of the `production/` scaffold (from `Polaris.zip`) into
the existing Next.js 15 codebase: the new authenticated `(app)/` workspace
(Roadmap, Strategist, Deadlines, Universities, Resources, Connections, Family,
Settings, Billing) layered on top of the existing `/dashboard`, `/onboard`,
`/university`, auth, and RAG pipeline.

Branch: `feat/app-shell`.

## Status

| Gate | Result |
|------|--------|
| `tsc --noEmit` | ✅ clean |
| `npm run lint` | ✅ clean (ESLint was newly configured — see below) |
| `npm run build` | ✅ success |

`/roadmap` is the new default authenticated home and server-renders real
milestone data from MongoDB for the logged-in session.

> **Note on locations.** The scaffold shipped in `Downloads/Polaris/production/`,
> which is a *separate* folder from this repo (`OneDrive/Desktop/Polaris/`). The
> scaffold was merged in here; `production/` itself was not copied into the repo.

---

## Files added (new)

**Infra / lib**
- `lib/nav.ts`, `lib/ratelimit.ts`, `types/app.ts` — copied verbatim from the scaffold.
- `lib/db/indexes-app.ts` — `ensureAppIndexes()` for the new collections.
- `lib/strategist/{schemas,prompt,stream,tools}.ts` — Strategist SSE agent.
- `lib/tasks/{schema,service}.ts`, `lib/deadlines/{schema,service}.ts` — service layers.

**Components**
- `components/app/{ui,LeftNav,TopBar,PathSwitcher,AgentChat,TaskCard,TaskPanel}.tsx` — verbatim.
- `components/app/BillingActions.tsx`, `components/app/SettingsDataControls.tsx` — **new** client islands (see "Adaptations").

**Routes / pages**
- `app/(app)/layout.tsx` + pages: `roadmap`, `roadmap/[taskId]`, `strategist`, `deadlines`, `universities`, `resources`, `connections`, `family`, `settings`, `billing`.
- `app/api/strategist/route.ts`, `app/api/tasks/[id]/route.ts`, `app/api/deadlines/route.ts`.
- `app/api/account/export/route.ts`, `app/api/account/delete/route.ts` — **new** (back the Settings data controls; reuse the existing `deleteUserCascade`).
- `.eslintrc.json` — **new** (see "New dependencies").

## Files modified (merged, not overwritten)

- `lib/features.ts` — added `PLAN_FEATURES` (kept existing `planMeets`, `canUse`, etc.).
- `lib/api/respond.ts` — made `withErrorHandling` generic over the route context so the new Next 15 dynamic routes typecheck. Existing `ok` / `fail` / `parseJson` / `HttpError` and error contract unchanged.
- `tailwind.config.ts` — **added** `nova`/`aurora` extra shades, `rose`, `gridTemplateColumns["14"]`, `boxShadow.card`. Existing `nova-400/500`, `aurora-400/500`, `bg`, `ink`, `polaris` left **unchanged** so the legacy UI is pixel-identical.
- `app/globals.css` — appended the `:root` color tokens + warm scrollbar. The scaffold's `body { background }` rule was **intentionally omitted** (it would have wiped the existing paper-gradient background).
- `lib/db/indexes.ts` — calls `ensureAppIndexes(db)` inside `ensureIndexes()`.
- `lib/db/collections.ts` — added `deleteLink()`; tidied a stale `eslint-disable` (now `void _id`, matching the repo's `content.ts` idiom).
- `lib/rag/search.ts` — added `searchKb(query, k)` adapter the Strategist consumes (embeds when a key exists, keyword-fallback otherwise).
- `app/api/links/route.ts` — see "Adaptations".
- `app/onboard/page.tsx`, `app/monitor/page.tsx`, `next.config.ts`, `middleware.ts` — see "Behaviour changes".
- `package.json` / `package-lock.json` — ESLint dev-deps.

## Files kept (scaffold version NOT used)

The scaffold shipped its own copies of these; the repo already had better/equivalent
versions, so per STRUCTURE.md step 5 the **repo versions were kept**:
- `lib/cn.ts` (repo uses `clsx` + `tailwind-merge`).
- `lib/authz.ts` (repo's `requireSession`/`requirePlan`/`requireRole` already match what the new code imports).

## Files removed

Two legacy pages collided with the new `(app)/` routes (Next.js cannot have two
pages on one path):

- `app/family/page.tsx` → replaced by `app/(app)/family/page.tsx`.
- `app/billing/page.tsx` → replaced by `app/(app)/billing/page.tsx`.

Their functionality was **preserved**:
- Billing checkout/portal → `(app)/billing` wires the same `/api/checkout` (via `startCheckout`) and `/api/portal` through `BillingActions`.
- Family **student-side** invite/list → `(app)/family`.
- Family **parent/partner invite acceptance** → relocated to `/monitor` (the parent's home). The `(app)` shell requires a student profile and would bounce profile-less parents to `/onboard`, so acceptance cannot live inside `(app)`. `/api/links/accept` is unchanged.

## Behaviour changes

- **Post-onboard redirect** → `/roadmap` (was `/dashboard`).
- **`/dashboard` → 301 → `/roadmap`** (`next.config.ts`). The legacy page still builds but the redirect shadows it; remove after one release.
- **`/universities/[id]` → 307 → `/university/[id]`** — bridges the new shell's detail links to the existing probability-engine page until the in-shell detail view ships (parity pass).
- **`middleware.ts`** now also protects the `(app)` paths (`/roadmap`, `/strategist`, `/deadlines`, `/universities`, `/resources`, `/connections`, `/settings`). The `(app)` layout also gates server-side.
- **New collections**: `deadlines`, `task_audit`, `strategist_messages` (90-day TTL), `connections` — all indexed via `indexes-app.ts`.

## Adaptations worth calling out

- **`app/api/links/route.ts`** now accepts **both** the legacy JSON body (`{ viewerEmail, relationship }`) and the form-encoded body the new `(app)/family` form posts (`{ email, relationship }`); adds a self-invite guard and `DELETE ?id=` revoke; native form posts redirect back to `/family`.
- **`app/(app)/layout.tsx`** — the scaffold redirected to `/login`; the repo's auth route is `/signin` (NextAuth `pages.signIn`). Updated.
- **Settings / Billing** — the scaffold posted to non-existent endpoints (`/api/billing/*`, `/api/account/*`) and Settings had an inline `onSubmit` on a server component (a Next.js error). Rewritten as server pages + small client islands wired to real endpoints.

## Stubs: wired vs. remaining

**Wired in this merge**
- `compute_probability` tool → `lib/ml/probability.ts` (`scoreProbability` + `profileToInputs`, loaded via `getUniversities()`). **No demographic features** — inputs are GPA / test percentile / EC count / research only.
- Resources `loadDocs()` → `lib/rag/flatten.ts` (`flattenAllDocs()`), the same KB the dashboard/RAG pipeline use.
- Settings data controls → new `/api/account/export` + `/api/account/delete`.
- Strategist citations → `stream.ts` emits KB hits as `source` chunks and extracts inline `<cite>label|uri</cite>` tags into source chips (AgentChat renders them).

**Remaining TODOs**
- **Connections OAuth** — the page renders live connection status from the `connections` collection, but Connect/Disconnect are inert. There is **no existing OAuth pattern** in the repo (`lib/auth.ts` is credentials-only), so this needs new `lib/connections/<provider>.ts` handlers + provider credentials. Documented in the page header.
- **Family invite email** — the repo has no mail helper. `app/api/links/route.ts` has a `TODO(email)` one-liner: add `lib/mail/send.ts` (Resend/SES/etc.) and send `link.inviteToken` as a `/monitor?accept=<token>` link. Until then, the student shares the token manually.
- **`production/lib/strategist/stream.test.ts`** was **not** copied — the repo has no test runner configured, and the file's Jest-style globals would break `tsc`/`next build`. To enable it: `npm i -D vitest` + a `test` script (the test itself is framework-agnostic).
- **Pre-existing (not introduced here):** `app/api/probability/route.ts` has no auth check. The new Universities/Connections pages are `requirePlan("pro")`-gated, but you may want to gate that route too.

## New dependencies

ESLint was **never configured** in this repo (no config, `eslint` not installed) —
`npm run lint` previously dropped into the interactive setup prompt. Added:
- dev-deps: `eslint@^8.57.0`, `eslint-config-next@15.1.0`
- `.eslintrc.json` → `{ "extends": "next/core-web-vitals" }`

The existing codebase passes this config cleanly; only two copied pages needed
apostrophe escaping. `next/typescript` was intentionally **not** added — it would
fail on pre-existing `any` usage across the repo.

## Running it

`npm run dev`, sign in, complete `/onboard`, land on `/roadmap`. Requires
`.env.local` with `MONGODB_URI` (already present). `GEMINI_API_KEY` is optional —
the Strategist streams a deterministic offline fallback without it.
`UPSTASH_REDIS_REST_URL` / `_TOKEN` are optional (in-memory rate-limit fallback otherwise).

> **OneDrive gotcha.** This repo lives under `OneDrive/Desktop/`. OneDrive
> occasionally turns `.next/` build artifacts into cloud placeholders, which makes
> `next build` fail with `EINVAL: invalid argument, readlink '...\.next\...'`. It
> is not a code error — delete `.next` and rebuild (`rm -rf .next && npm run build`).
> Consider excluding `.next` from OneDrive sync, or moving the repo off OneDrive.

## Visual/behavioural parity pass — done

`Polaris App.html` was a self-extracting bundle (gzip+base64 React/Babel modules
behind a loader). Decoded it (`Downloads/extract-proto.js` → `Downloads/polaris-proto/`)
to read the real component source, then ported each screen to parity, wired to real data.

**Design system** — added the prototype's tokens to `tailwind.config.ts`
(`paper.*`, `ink.faint`, exact `nova`, `aurora.100`, flat `signal`, `shadow.pop/inset`)
and its CSS utilities to `globals.css` (`paper-grain`, `hairline`, `marker-dot`,
`grad-text`, `divider-soft`, `pulse-dot`, `typing-dot`, `frame`, `spark`, `cal-day`,
`scroll-y`, `chev`). `components/app/ui.tsx` is now the prototype's full primitive set
+ icon glyphs (backward-compatible). Note: `nova-400/500` shifted to the prototype's
exact shades — a subtle change visible only on the redirected legacy `/dashboard`.

**Screens** (all real-data-wired, prototype-faithful):
- **Roadmap** (`RoadmapClient`) — KPI strip (incl. live engine probability), filter chips, quarter grouping, in-page TaskDetailPanel with Plan/Resources/Why/Activity tabs; status toggle still PATCHes `/api/tasks/[id]`.
- **Universities** (`UniversitiesClient`) — shortlist + 4 factor sliders that ARE the engine inputs; `scoreProbability` runs client-side (pure fn) so probability recomputes live on drag. No demographic features.
- **Deadlines** — month calendar with hard/soft/repeat colour codes, focus card, up-next, and a 12-week workload heatmap, all from the `deadlines` collection.
- **Resources** (`ResourcesClient`) — card grid + filter + search + preview modal; the preview shows the **actual** KB text (`flattenAllDocs`), not a skeleton.
- **Connections** — live status cards (from the `connections` collection) + B2B2C partner-offers strip.
- **Family** — members (from `links`) + wired invite form + a weekly-digest preview computed from real milestones + the engine + a shared-activity feed.
- **Strategist** (`StrategistClient`) — full-canvas chat streaming the real `/api/strategist` SSE with citations + suggested-prompt chips, and a gap-analysis table built from the engine's real factor comparison.

**Still functional-but-not-repainted:** the shell (`LeftNav` / `TopBar` / `AgentChat`)
keeps its merged implementation — it shares the same palette so it reads cohesively, and
`AgentChat` already has the real SSE wiring (better than the prototype's mock). A pixel
re-paint of the shell to match the prototype's logo pulse-dot / nav details is the one
remaining polish item. Billing/Settings are the prototype's own placeholders, wired to
real endpoints.
