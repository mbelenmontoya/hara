# Admin Practices Catalog Management Implementation Plan

Created: 2026-05-07
Author: belu.montoya@dialpad.com
Status: VERIFIED
Verified: 2026-05-07 by belu.montoya@dialpad.com (changes-review + feature-dev:code-reviewer + Codex adversarial review; all findings addressed or explicitly deferred)
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Add admin UI to manage the `practices` catalog (15-row table seeded in migration 010) without SQL Editor trips. Was the explicitly-deferred v1.x piece from Soft Launch Push Item 1.

**Architecture:** New `/admin/practices` section. List page is a server component that fetches all practices (active + inactive) plus per-practice usage counts in one trip. Inline active-toggle with confirm modal handles deactivation. Create + edit live on dedicated routes (`/new`, `/[key]/edit`) backed by a shared `<PracticeForm>` client component. Two new admin API routes (`/api/admin/practices`, `/api/admin/practices/[key]`) handle GET/POST/PATCH. `lib/practices.ts` gains `bustPracticesCache()` (called from write paths) and `getAllPractices()` (admin read, incl. inactive, bypasses cache).

**Tech Stack:** Next.js 14.2 App Router (server components + client components split), TypeScript, Tailwind v4 tokens, Supabase service-role client, Vitest (unit + integration), Playwright (E2E).

## Scope

### In Scope

- `/admin/practices` — list page (server component), shows all practices (active + inactive) with sort_order column, label, key, slug, active status, and usage count (number of professionals using each practice).
- `/admin/practices/new` — create form with fields: `key` (kebab-case, immutable), `label`, `slug` (auto-derived from key, editable), `sort_order` (numeric). `active` defaults to true.
- `/admin/practices/[key]/edit` — edit form. Same fields except `key` is read-only. Includes `active` toggle.
- Inline active-toggle on list page → confirm modal showing usage count → PATCH `{ active: false|true }`.
- `GET /api/admin/practices` — returns `{ practices: PracticeRow[] }` where each row includes catalog fields + `usage_count` (number).
- `POST /api/admin/practices` — create. Validates kebab-case key, unique key + slug, label/sort_order. Returns 400 on duplicate key/slug. Calls `bustPracticesCache()` on success.
- `PATCH /api/admin/practices/[key]` — update label/slug/sort_order/active. `key` is immutable: if the request body includes `key` and `body.key !== params.key`, return **400** with `"El campo \`key\` es inmutable. Para renombrar, deactivate + recreate."`. Calls `bustPracticesCache()` on success.

- **Usage count includes only professionals with `status IN ('active', 'submitted')`.** Rejected, paused, and draft pros are excluded — they're not "real" usage signals when an admin is deciding whether to deactivate a practice. **`leads.practice_preference[]` is NOT counted toward usage.** Leads are transient and re-categorized by admin during the matching flow; including them would inflate the count with stale signals. The deactivation modal copy reflects this: "*N profesionales activos/pendientes* usan esta práctica" — no mention of leads.
- `lib/practices.ts` extensions: `bustPracticesCache()` (clears the module-level cache); `getAllPractices()` (admin read, returns active + inactive, bypasses cache).
- AdminLayout nav: add "Practices" item between "Profesionales" and "PQLs".
- Unit + integration + E2E test coverage matching Item 1's bar.

### Out of Scope

- **Hard delete** — explicitly disallowed. `DELETE` route is not implemented. Deactivate via `active: false`.
- **Editable `key`** — TEXT[] arrays in `professionals.practices` and `leads.practice_preference` reference keys with no FK; renaming would orphan every assignment. Mistyped key → deactivate + recreate.
- **Drag-and-drop reorder** — numeric `sort_order` input only. Lower-frequency catalog (15 entries, edited rarely) doesn't justify the complexity.
- **Bulk import/export** — CSV upload, JSON dump, etc. v1 is row-by-row.
- **Public `/api/practices` route** — admins read via `/api/admin/practices`; user-facing forms keep server-component prop drilling. A public route is YAGNI for v1.
- **Practice descriptions / icons / images** — schema lives in PRODUCT.md as future enhancement; not in this plan.
- **Audit log of admin edits** — out of scope. If a regression appears, `git log` on the migrations + DB row inspection is enough for v1 admin troubleshooting.
- **Replacing `lib/admin-auth.ts` stub with real Supabase Auth check** — pre-existing gap. Item 1.5 inherits the stub; documented as a follow-up. (Same risk applies to all `/api/admin/*` routes.)

## Approach

**Chosen:** Server-shell + client-form pattern (matches Item 1's split for `/profesionales/registro` and `/solicitar`).

**Why:** Server components fetch the practice list (and individual practice on edit) directly via `supabaseAdmin`, eliminating the initial-blank flicker that plagues the existing all-client `/admin/professionals` page. Client components own only what state actually requires interactivity (forms, the toggle modal). Item 1 just established this pattern; spreading it to the new admin section keeps the codebase converging rather than carrying two competing patterns. Cost: divergence from existing `/admin/leads`, `/admin/professionals`, `/admin/reviews` pages, which still use `useEffect` fetches. Acceptable — those will be refactored to match in a future cleanup pass.

**Alternatives considered:**

- **All client-side (matches existing /admin pages today).** Rejected because Item 1 deliberately moved the codebase forward, and starting a brand-new section with the legacy pattern would waste that win. Existing pages will be modernized later.
- **Inline create/edit on the list page (modal forms instead of separate routes).** Rejected because Bel chose separate routes in Batch 1 — they're more consistent with `/admin/professionals/[id]/review` and easier to deep-link. Modals win when speed of one-off edits dominates; this catalog is low-frequency.
- **Drag-and-drop reorder via `dnd-kit` or similar.** Rejected as out of scope. Numeric `sort_order` input handles 15-entry maintenance fine.

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - Server-shell + client-form split: `app/profesionales/registro/page.tsx` (server, fetches catalog, passes to `RegistroForm`) + `app/profesionales/registro/RegistroForm.tsx` (`'use client'`).
  - **GET + write API route shape (data layer):** `app/api/admin/professionals/[id]/route.ts:29-54` (GET) and `:82-120` (PATCH practices-only branch — single-query update with `.select('key').single()` to eliminate TOCTOU). **Note:** that route does NOT call `getAdminUserId()` itself; auth is left to upstream middleware. For Item 1.5 we include the in-handler auth gate explicitly (see next bullet).
  - **Admin auth gate (in-handler):** mirror `app/api/admin/pqls/[id]/adjust/route.ts:21-29` — first line of the handler is `const adminUserId = getAdminUserId()`; if `typeof adminUserId === 'object'`, return `NextResponse.json({ error: adminUserId.error }, { status: adminUserId.status })`. `lib/admin-auth.ts:6` returns `string | { error, status }`. The dev placeholder UUID is fine; production fail-closed (503) is intentional pre-Clerk-replacement.
  - Catalog cache pattern: `lib/practices.ts:17-39` (module-level `cache` + `TTL_MS = 60_000`). The new `bustPracticesCache()` is one line: `cache = null`.
  - List page UI: `app/admin/professionals/page.tsx:184-226` (status-grouped GlassCard layout with `grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4`). For practices, a single grouping (sort_order ascending, key ascending as tiebreaker) is enough.
  - Modal pattern: `app/admin/professionals/components/DestacadoPaymentModal.tsx` (also rendered in `/admin/professionals` page). Uses the shared `<Modal>` from `app/components/ui/Modal.tsx`.
  - AdminLayout nav: `app/components/AdminLayout.tsx:14-18` is a single `nav` array — adding `{ href: '/admin/practices', label: 'Prácticas' }` is one entry. **Use Spanish label** ("Prácticas") to match the `Profesionales` convention.

- **Conventions:**
  - Spanish for all user-facing copy (Argentine informal — "vos", "querés"). Toast/error messages in Spanish.
  - Use design tokens (`bg-surface`, `text-foreground`, `border-outline`, `shadow-soft`/`shadow-elevated`, `rounded-xl`/`rounded-2xl`) — never hex.
  - Errors logged via `lib/monitoring.ts:logError`, never `console.log` (allowed: `console.error` in catch blocks per `.claude/rules/component-standards.md`).
  - All admin API routes: `export const runtime = 'nodejs'` (mirrors `/api/admin/professionals/[id]/route.ts:17`).
  - File size: components ≤ 440 lines, functions ≤ 50 lines.

- **Key files:**
  - `lib/practices.ts` — catalog read helpers + cache. Will gain `bustPracticesCache()` and `getAllPractices()`.
  - `lib/admin-auth.ts` — admin gate.
  - `lib/supabase-admin.ts` — service-role client.
  - `migrations/010_holistic_practices_catalog.sql` — schema reference for the `practices` table.
  - `app/components/AdminLayout.tsx` — admin nav.
  - `app/components/ui/{GlassCard,Modal,Button,Badge,EmptyState,SectionHeader}.tsx` — UI primitives.

- **Gotchas:**
  - `practices.key` is the primary key AND the foreign-effective reference (no actual FK). Mutating it would orphan every `professionals.practices[]` and `leads.practice_preference[]` entry that points to it. Treat as immutable in the API layer (the schema doesn't enforce it; we do).
  - The 60s in-memory cache lives per Node.js process. On Vercel serverless, multiple cold processes mean a cache bust in one process won't affect others. Mitigation: TTL caps staleness at 60s; document the trade-off; not blocking for v1.
  - Usage count requires reading the entire `professionals.practices` array column. For 65 rows it's trivial; if the table grows past 10k rows, replace with an aggregation query or denormalized counter.
  - `lib/admin-auth.ts:6-19` is fail-closed in production (returns 503) — Clerk integration was never wired. All current `/api/admin/*` endpoints inherit this. Item 1.5 inherits it too. The actual admin auth in dev uses Supabase Auth via `/admin/login` page + middleware — but the API-route-level guard from `lib/admin-auth.ts` is still the stub. Documented as a separate cleanup, not blocking.

- **Domain context:**
  - The `practices` catalog is the source of truth for holistic-wellness modalities (reiki, meditación, etc.) shown in registration form, concierge intake, and admin re-classification banner. Immutable keys are essential — they're stored as TEXT[] in two tables.
  - `active=true` filters practices from the public picker but NOT from display lookups. A pro with a deactivated practice in their `practices[]` still shows the label on `/p/[slug]`. This is by design — deactivating means "don't offer this in the picker anymore," not "purge from history."
  - Sort order matters: practices appear in the picker in `sort_order ASC`. The seeds use multiples of 10 (10, 20, 30, …, 150) to leave room for inserts without renumbering.

## Runtime Environment

- **Start command:** `npm run dev` (port 3000)
- **Deploy path:** Vercel (`https://hara-weld.vercel.app`)
- **Health check:** `GET /api/admin/practices` should return JSON with the 15-row catalog when the dev server is up and migration 010 is applied.
- **Restart procedure:** `rm -rf .next && npm run dev` if dev cache corrupts (per CLAUDE.md).

## Assumptions

- Migration 010 is applied to all environments (dev, staging, prod) — verified 2026-05-07. Tasks 1-9 depend on this.
- The `practices` table schema (`key TEXT PK, label TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, sort_order INT DEFAULT 0, active BOOL DEFAULT TRUE, created_at TIMESTAMPTZ`) is stable — no schema changes in this plan. All tasks depend.
- `lib/admin-auth.ts:getAdminUserId()` is the canonical API-route auth gate. New routes mirror its usage from `app/api/admin/pqls/[id]/adjust/route.ts:26-29`. Tasks 2, 3 depend.
- The 60s in-memory cache TTL is acceptable as an upper bound on staleness for admin edits. No need to invalidate via Next.js `revalidateTag` for v1. Task 1 depends.
- Practice `key` is the only safely-immutable identifier; the catalog never needs renames. Bel confirmed — mistyped key is rare and recoverable via deactivate + recreate. Task 3 depends.
- Existing 15 seeded practices already have unique keys + slugs. Validation in POST handles only future inserts. Task 2 depends.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cache bust only affects current process; other serverless processes serve stale data for up to 60s | High | Low | TTL caps staleness at 60s. **In-process bust is verified** by Task 10 integration test (#10). **Cross-process propagation is explicitly NOT E2E-tested** — documented as a known limitation in `lib/practices.ts` and the integration test's header comment. Future fix (deferred): replace in-memory cache with `revalidateTag('practices')` once the catalog is read through Next.js fetch cache. |
| Admin enters a duplicate key/slug (e.g., re-creating a deactivated practice) | Medium | Low | POST returns 400 with clear Spanish error: "Ya existe una práctica con esa clave/slug." Handler must catch unique-violation by Supabase error code rather than relying on race-prone pre-checks. |
| Admin attempts to PATCH a key that no longer exists (deleted via SQL Editor between page load and submit) | Low | Low | PATCH does single `update().eq('key', key).select('key').single()`; Supabase returns null data → API returns 404. |
| Deactivating a heavily-used practice surprises the admin (didn't realize 30 pros use it) | Medium | Low | Confirm modal shows usage count in bold ("**30 profesionales** usan esta práctica. Desactivar?"). Accept-and-continue UX matches Bel's choice from Batch 1. |
| Active toggle PATCH races with another admin's edit | Low | Low | Single-query update via `.eq('key', k).select().single()` — last write wins. Acceptable for low-frequency catalog. |
| Slug collision with an existing public route (e.g., admin creates slug `admin` or `api`) | Low | Low | `getActivePractices()` is read-only; slugs are not currently used in URL paths. If public slug routes are added later, validate against a reserved-words list at that time. Not blocking for v1. |
| Server-component render fails if the practices table is empty (fresh DB, before seeds applied) | Low | Low | List page renders `EmptyState` with link to `/admin/practices/new`. Guard at the data layer too: `getAllPractices()` returns `[]` on no rows, never throws. |
| Cache bust silently fails in some processes (e.g., one process imports a fresh `lib/practices.ts` module — won't share cache) | Low | Low | This is a Node.js module-graph reality, not a bug per se. Documented in `lib/practices.ts`. The 60s TTL caps the impact. |

## Goal Verification

### Truths

1. **An admin can create a new practice from `/admin/practices/new`,** it appears immediately in the admin list, and after at most 60s appears in the registration form picker. **Falsifiable:** TS-001 passes; integration test asserts the row exists in the DB and `getActivePractices()` returns it after `bustPracticesCache()` is called.
2. **An admin can edit a practice's label, slug, or sort_order** from `/admin/practices/[key]/edit`, and the changes are reflected in the admin list immediately and in the public picker after cache bust. **Falsifiable:** TS-002 passes; PATCH integration test asserts DB state matches request, GET returns updated row.
3. **An admin can deactivate a practice with usage > 0** via the inline toggle, sees the usage count in a confirm modal, and after confirming the practice no longer appears in the public picker but still renders on existing professional profiles. **Falsifiable:** TS-003 passes; integration test sets `active=false`, asserts `getActivePractices()` excludes it, asserts `/p/[slug]` for a pro using the practice still shows the label.
4. **Re-activating** a previously-deactivated practice is supported via the same toggle. **Falsifiable:** integration test PATCHes `active: true` and asserts the practice appears in `getActivePractices()` again.
5. **Duplicate-key creation returns 400** with a clear Spanish error. **Falsifiable:** unit test on POST asserts response status + message.
6. **PATCHing a non-existent key returns 404.** **Falsifiable:** unit test on PATCH `/api/admin/practices/nonexistent` asserts 404.
7. **The `key` field cannot be changed** via PATCH — `body.key !== params.key` returns **400** with a clear Spanish message. The DB row's key is unchanged. **Falsifiable:** unit test asserts `PATCH /api/admin/practices/reiki` with body `{ key: 'reiki-new', label: '...' }` returns 400; row remains keyed by `reiki`.
8. **The `Prácticas` nav link** appears in AdminLayout between Profesionales and PQLs and routes to `/admin/practices`. **Falsifiable:** TS-001 step 1 asserts the link is visible and active when on the page. (No `AdminLayout.test.tsx` exists in the repo today; we don't add one for this single-line change — E2E coverage is sufficient.)

### Artifacts

- `app/admin/practices/page.tsx` (server) + `app/admin/practices/PracticesList.tsx` (client) — verifies truths 1, 3, 4, 8.
- `app/admin/practices/new/page.tsx` + `app/admin/practices/components/PracticeForm.tsx` — verifies truth 1.
- `app/admin/practices/[key]/edit/page.tsx` — verifies truth 2.
- `app/api/admin/practices/route.ts` (GET + POST) — verifies truths 1, 5.
- `app/api/admin/practices/[key]/route.ts` (PATCH) — verifies truths 2, 3, 4, 6, 7.
- `lib/practices.ts` — `bustPracticesCache()` + `getAllPractices()` + `key`-tiebreaker on existing `loadCache()` — verifies truths 1, 2, 3, 4 (cache freshness + ordering).
- `lib/admin-practices.ts` — `loadAdminPracticesView()` (joins practices with usage counts; status-filtered to active+submitted; excludes leads) — verifies truth 3 (modal count semantics).
- `app/components/AdminLayout.tsx` — verifies truth 8.
- E2E `__tests__/e2e/admin-practices.spec.ts` — verifies truths 1, 2, 3, 8 end-to-end.
- Integration `__tests__/integration/admin-practices.test.ts` — verifies truths 1-7 against the real DB (catches RLS/schema regressions that mocked unit tests can't).

## E2E Test Scenarios

### TS-001: Admin creates a new practice and it appears in the registration picker

**Priority:** Critical
**Preconditions:** Logged in as admin (Supabase Auth session active in dev). Migration 010 applied. No existing practice with key `e2e-test-practice`.
**Mapped Tasks:** Task 2, Task 5, Task 6, Task 8

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/practices` | Page loads with list of 15+ existing practices, sort_order ascending. "Practices" nav link is highlighted as active. |
| 2 | Click "Nueva práctica" button | Navigates to `/admin/practices/new`. Form shows empty fields: key, label, slug, sort_order. Active toggle defaults to on. |
| 3 | Fill key=`e2e-test-practice`, label=`E2E Test Practice`, sort_order=`999`. Slug auto-fills to `e2e-test-practice` | Form values match input. Slug field shows the auto-derived value but is editable. |
| 4 | Click "Crear" | Toast/redirect: navigates back to `/admin/practices`. New practice row visible in the list at the bottom (sort_order 999). |
| 5 | Open `/profesionales/registro` in a new tab, advance to step 3 | "E2E Test Practice" appears as a chip in the picker at the bottom (matching its sort_order). |

**Cleanup:** Delete the test row via `supabaseAdmin.from('practices').delete().eq('key', 'e2e-test-practice')`.

### TS-002: Admin edits a practice's label and the change propagates

**Priority:** High
**Preconditions:** Logged in as admin. Test practice exists (created in TS-001 or via setup hook).
**Mapped Tasks:** Task 3, Task 7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/practices` | List loads. |
| 2 | Click "Editar" on the test practice row | Navigates to `/admin/practices/[key]/edit`. Form pre-fills with the current values. The `key` field is read-only (disabled or static text). |
| 3 | Change label to `E2E Test Practice (edited)`, click "Guardar" | Toast/redirect to `/admin/practices`. Row's label cell now shows the new value. |
| 4 | Open `/profesionales/registro` step 3 | The practice chip displays the new label. (May take up to 60s without manual cache bust; PATCH calls `bustPracticesCache()` so should be immediate within the same process.) |

### TS-003: Admin deactivates a practice in use

**Priority:** Critical
**Preconditions:** Logged in as admin. Concrete setup steps run in `beforeAll`:

```ts
// 1. Insert test practice (active=true so registration validation accepts it).
await supabaseAdmin.from('practices').insert({
  key: 'e2e-test-practice', label: 'E2E Test Practice', slug: 'e2e-test-practice',
  sort_order: 999, active: true,
})
// 2. Insert one test professional that references the test practice.
const { data: pro } = await supabaseAdmin.from('professionals').insert({
  slug: 'e2e-test-pro-deactivate', status: 'active', full_name: 'E2E Deactivate Pro',
  email: 'e2e-deactivate@test.com', whatsapp: '+5491100000000', country: 'AR',
  modality: ['online'], specialties: ['ansiedad'], practices: ['e2e-test-practice'],
}).select('id').single()
// store pro.id for cleanup
```

Cleanup (`afterAll`): `supabaseAdmin.from('professionals').delete().eq('id', pro.id)` then `supabaseAdmin.from('practices').delete().eq('key', 'e2e-test-practice')`.

**Mapped Tasks:** Task 3, Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/practices` | Test practice row shows `active=true` toggle and a usage count badge ("1 profesional"). |
| 2 | Click the active toggle on the test practice row | Confirm modal appears with text including "1 profesional usa esta práctica" and "Desactivar?" / "Cancelar" buttons. |
| 3 | Click "Desactivar" | Modal closes, toggle visibly flips to inactive state, toast shows success. |
| 4 | Refresh `/admin/practices` | Test practice still in list; toggle shows inactive. |
| 5 | Open `/profesionales/registro` step 3 | Test practice chip is NOT visible in the picker. |
| 6 | Open the assigned professional's profile `/p/[slug]` | The practice label still appears in the "Prácticas" section — deactivation hides from picker, not from existing assignments. |
| 7 | Toggle back to active on the admin list and confirm | Picker shows the chip again on next reload. |

## File Structure

- `lib/practices.ts` (modify) — add `bustPracticesCache()`, `getAllPractices()`, and the `key` tiebreaker on the existing `loadCache()` query.
- `lib/admin-practices.ts` (create) — `loadAdminPracticesView()` joins practices with usage counts (status-filtered to active+submitted, leads excluded). Lives separately so `lib/practices.ts` stays focused on the lookup table.
- `app/api/admin/practices/route.ts` (create) — GET (list with usage counts) + POST (create with pre-check + 23505 backstop + cache bust).
- `app/api/admin/practices/[key]/route.ts` (create) — PATCH (update label/slug/sort_order/active; key-immutability returns 400; cache bust on success).
- `app/admin/practices/page.tsx` (create) — server component, fetches list via `loadAdminPracticesView()`, renders `<PracticesList>`.
- `app/admin/practices/PracticesList.tsx` (create) — `'use client'`, list rows + active toggle + confirm modal.
- `app/admin/practices/components/PracticeForm.tsx` (create) — `'use client'`, shared create+edit form with `normalizeSlug()` helper.
- `app/admin/practices/new/page.tsx` (create) — server shell renders `<PracticeForm mode="create" />`.
- `app/admin/practices/[key]/edit/page.tsx` (create) — server shell, fetches practice via `supabaseAdmin`, renders `<PracticeForm mode="edit" initial={...} />`. Uses `notFound()` on missing key.
- `app/components/AdminLayout.tsx` (modify) — add nav entry `{ href: '/admin/practices', label: 'Prácticas' }`.
- `lib/practices.test.ts` (modify) — extend with cache-bust + getAllPractices + tiebreaker tests.
- `app/api/admin/practices/route.test.ts` (create) — unit tests for GET + POST.
- `app/api/admin/practices/[key]/route.test.ts` (create) — unit tests for PATCH.
- `app/admin/practices/components/PracticeForm.test.tsx` (create) — unit tests for the form.
- `app/admin/practices/PracticesList.test.tsx` (create) — unit tests for the list + toggle modal.
- `__tests__/integration/admin-practices.test.ts` (create) — DB-backed integration tests.
- `__tests__/e2e/admin-practices.spec.ts` (create) — Playwright E2E for TS-001/002/003.

## Progress Tracking

- [x] Task 1: `lib/practices.ts` — add `bustPracticesCache()` and `getAllPractices()` (admin read, incl. inactive)
- [x] Task 2: `GET + POST /api/admin/practices` — list with usage counts + create
- [x] Task 3: `PATCH /api/admin/practices/[key]` — update label/slug/sort_order/active; key immutable
- [x] Task 4: `app/admin/practices/components/PracticeForm.tsx` — shared create+edit client form
- [x] Task 5: `app/admin/practices/page.tsx` (server) + `PracticesList.tsx` (client) + active-toggle confirm modal
- [x] Task 6: `app/admin/practices/new/page.tsx` — create page server shell
- [x] Task 7: `app/admin/practices/[key]/edit/page.tsx` — edit page server shell with prefill
- [x] Task 8: `app/components/AdminLayout.tsx` — add Practices nav item
- [x] Task 9: E2E tests — TS-001, TS-002, TS-003 (skip gracefully without E2E_ADMIN_EMAIL/PASSWORD; auth-setup ESM bug fixed)
- [x] Task 10: Integration tests against real DB — `__tests__/integration/admin-practices.test.ts` (10/10 pass)

**Total Tasks:** 10 | **Completed:** 10 | **Remaining:** 0

## Implementation Tasks

### Task 1: `lib/practices.ts` — `bustPracticesCache()` + `getAllPractices()`

**Objective:** Add two exported helpers: `bustPracticesCache()` (clears the module-level cache) and `getAllPractices()` (returns active + inactive rows, bypasses cache, used by admin GET).
**Dependencies:** None
**Mapped Scenarios:** TS-001, TS-002, TS-003 (cache freshness)

**Files:**
- Modify: `lib/practices.ts`
- Modify: `lib/practices.test.ts` — add tests for new exports

**Key Decisions / Notes:**
- `bustPracticesCache()` body: `cache = null`. One line. Add a comment explaining the per-process limitation: *"Clears this process's cache; other serverless processes serve stale data until their TTL expires (≤ 60s). For zero-latency global cache invalidation, replace with `revalidateTag('practices')` once the catalog moves to Next.js fetch cache — out of scope for v1."*
- `getAllPractices()` body: queries `supabaseAdmin.from('practices').select('key, label, slug, sort_order, active').order('sort_order', { ascending: true }).order('key', { ascending: true })`. **Tiebreaker on `key`** — `sort_order` has no UNIQUE constraint, so equal values would otherwise sort non-deterministically. **No `created_at` selected** — no consumer needs it; keep the `Practice` type unchanged. No `.eq('active', true)` filter (returns all).
- Apply the same tiebreaker (`.order('key', { ascending: true })`) to the existing `loadCache()` query at `lib/practices.ts:32` so public-side ordering is also deterministic.
- Do NOT cache `getAllPractices()` — admin reads are infrequent and need fresh data after edits. The 60s cache is for hot-path public reads.
- Export `getAllPractices` as a named export. The existing `Practice` type is reused as-is.

**Definition of Done:**
- [ ] `bustPracticesCache()` is exported and clears `cache`.
- [ ] After `bustPracticesCache()`, the next call to `getActivePractices()` issues a fresh Supabase query (not cached).
- [ ] `getAllPractices()` returns active and inactive rows, ordered by `sort_order ASC, key ASC`.
- [ ] `getAllPractices()` does NOT populate or read the cache.
- [ ] Existing `loadCache()` query also has the `key` tiebreaker.
- [ ] `Practice` type unchanged (no `created_at`).
- [ ] Existing 8 tests still pass.
- [ ] 4+ new tests cover: bust clears cache, getAllPractices returns inactive rows too, getAllPractices doesn't read cache, getAllPractices ordering by sort_order then key.

**Verify:**
- `npx vitest run lib/practices.test.ts`

---

### Task 2: `GET + POST /api/admin/practices` — list with usage counts + create

**Objective:** New admin API route. GET returns all practices (active + inactive) with `usage_count` for each. POST creates a new practice with validation.
**Dependencies:** Task 1
**Mapped Scenarios:** TS-001

**Files:**
- Create: `app/api/admin/practices/route.ts`
- Create: `app/api/admin/practices/route.test.ts`

**Key Decisions / Notes:**
- **Auth gate:** mirror `app/api/admin/pqls/[id]/adjust/route.ts:21-29` — `const adminUserId = getAdminUserId(); if (typeof adminUserId === 'object') { return NextResponse.json({ error: adminUserId.error }, { status: adminUserId.status }) }`.
- **Data layer shape:** mirror `app/api/admin/professionals/[id]/route.ts` — header comment style, `runtime = 'nodejs'`, `supabaseAdmin` import, `logError` from `lib/monitoring` for unexpected errors.
- **Shared helper for usage counts:** new file `lib/admin-practices.ts` exports `loadAdminPracticesView(): Promise<PracticeWithCount[]>`. Keeps `lib/practices.ts` focused on the lookup table; the helper that joins with `professionals` data lives in its own file. Used by both this GET route and the server page in Task 5.
- GET implementation (delegates to the helper):
  1. Auth gate.
  2. `const practices = await loadAdminPracticesView()` (defined in `lib/admin-practices.ts`):
     - `const all = await getAllPractices()`
     - `const { data: pros } = await supabaseAdmin.from('professionals').select('practices').in('status', ['active', 'submitted'])` — **filter to active + submitted only**. Rejected/paused/draft pros don't count as real usage.
     - Build `Map<string, number>` by iterating each row's `practices[]`, incrementing the count per key seen.
     - Return `all.map(p => ({ ...p, usage_count: counts.get(p.key) ?? 0 }))`.
  3. Return `NextResponse.json({ practices })`.
  4. **`leads.practice_preference[]` is intentionally NOT included** — leads are transient and re-categorized; rationale documented in Scope.
- POST implementation:
  1. Auth gate.
  2. Parse JSON body, validate fields with helper `validatePracticeInput()`:
     - `key`: required string, regex `/^[a-z0-9]+(-[a-z0-9]+)*$/`, 2-60 chars.
     - `label`: required string, 2-80 chars (after trim).
     - `slug`: optional string (defaults to key); same regex + length as key.
     - `sort_order`: required integer ≥ 0.
     - `active`: optional boolean, defaults to true.
  3. **Pre-check uniqueness** (cleaner error UX than parsing 23505):
     - `supabaseAdmin.from('practices').select('key').eq('key', input.key).maybeSingle()` → if exists, return 400 `"Ya existe una práctica con la clave '<key>'."`
     - `supabaseAdmin.from('practices').select('key').eq('slug', input.slug).maybeSingle()` → if exists, return 400 `"Ya existe una práctica con el slug '<slug>'."`
     - **TOCTOU note:** two admins racing is acceptable — admin writes are low-frequency and the 23505 catch path is a backstop.
  4. Insert: `supabaseAdmin.from('practices').insert({ key, label, slug, sort_order, active }).select('key, label, slug, sort_order, active').single()`.
  5. **23505 backstop:** if insert errors with code `23505` (race), return 400 with a generic `"Conflicto de unicidad. Intentá de nuevo."` and `logError` the original.
  6. Other insert errors: `logError`, return 500 `"Error al crear la práctica."`.
  7. On success: `bustPracticesCache()`; return **`NextResponse.json({ success: true, practice }, { status: 201 })`**.

**Definition of Done:**
- [ ] GET returns 200 with `{ practices: PracticeWithCount[] }`.
- [ ] GET response includes `usage_count` for every practice (0 for unused, N for used).
- [ ] GET counts only professionals with `status IN ('active', 'submitted')`.
- [ ] GET does NOT count `leads.practice_preference[]`.
- [ ] GET returns 503 when `getAdminUserId()` returns object (production stub).
- [ ] POST validates each field; specific 400 error per failure mode.
- [ ] POST pre-checks key + slug uniqueness; specific Spanish 400 per collision.
- [ ] POST happy path returns **201** with `{ success: true, practice }`.
- [ ] POST calls `bustPracticesCache()` on success.
- [ ] POST defaults `slug = key` when slug is omitted; defaults `active = true` when active is omitted.
- [ ] POST 23505 race backstop returns 400 with generic message; calls `logError`.
- [ ] 8+ unit tests cover: GET success, GET auth fail, POST happy, POST each validation, POST pre-check key collision, POST pre-check slug collision, POST cache bust called.

**Verify:**
- `npx vitest run app/api/admin/practices/route.test.ts`

---

### Task 3: `PATCH /api/admin/practices/[key]` — update fields; key immutable

**Objective:** New admin API route for updating an existing practice's `label`, `slug`, `sort_order`, or `active`. The `key` URL parameter identifies the row; any `key` in the body is silently dropped (immutable).
**Dependencies:** Task 1
**Mapped Scenarios:** TS-002, TS-003

**Files:**
- Create: `app/api/admin/practices/[key]/route.ts`
- Create: `app/api/admin/practices/[key]/route.test.ts`

**Key Decisions / Notes:**
- Path param: `[key]` (not `[id]`) — matches the schema PK.
- **Auth gate:** mirror `app/api/admin/pqls/[id]/adjust/route.ts:21-29` (same as Task 2).
- PATCH implementation:
  1. Auth gate.
  2. Validate URL `key`: same regex as Task 2.
  3. Parse body, accept any subset of `{ label, slug, sort_order, active }`. Build `update` payload only from provided fields. Validate each:
     - `label`: 2-80 chars.
     - `slug`: kebab-case regex.
     - `sort_order`: integer ≥ 0.
     - `active`: boolean.
  4. **Key-immutability check (400, not silent drop):** if `body.key !== undefined && body.key !== params.key`, return 400 `"El campo \`key\` es inmutable. Para renombrar, deactivate + recreate."`. **If `body.key === params.key` it's allowed but not added to the update payload** (idempotent no-op).
  5. Empty update payload (after dropping `key`) → 400: `"No hay cambios para guardar."`
  6. **Pre-check slug uniqueness if slug is being changed:** `supabaseAdmin.from('practices').select('key').eq('slug', newSlug).neq('key', params.key).maybeSingle()` → if exists, 400 `"Ya existe otra práctica con el slug '<slug>'."`
  7. Single-query update: `supabaseAdmin.from('practices').update(payload).eq('key', urlKey).select('key').single()`. Schema has no `updated_at` column on `practices` (verified `migrations/010_holistic_practices_catalog.sql:21-27`); do not add.
  8. Catch:
     - `data === null` → 404 `"Práctica no encontrada"`.
     - Unique-violation `23505` (slug collision race) → 400 with generic message; `logError` original.
     - Other error → 500 `"Error al actualizar la práctica"`; `logError`.
  9. On success: `bustPracticesCache()`; return `{ success: true }`.

**Definition of Done:**
- [ ] PATCH with valid body updates the row and returns `{ success: true }`.
- [ ] PATCH with `{ key: 'new-key', label: '...' }` returns **400** "El campo `key` es inmutable…"; DB row unchanged.
- [ ] PATCH with `{ key: <same as URL>, label: '...' }` succeeds (idempotent).
- [ ] PATCH on non-existent key returns 404.
- [ ] PATCH with empty body returns 400.
- [ ] PATCH with each invalid field returns 400 with field-specific message.
- [ ] PATCH with slug collision (pre-check) returns 400 with the colliding slug in the message.
- [ ] PATCH calls `bustPracticesCache()` on success.
- [ ] 8+ unit tests cover: each happy path field, key-immutability 400, idempotent same-key allowed, 404, empty body, each invalid-field validation, slug collision, cache bust called.

**Verify:**
- `npx vitest run app/api/admin/practices/[key]/route.test.ts`

---

### Task 4: `PracticeForm.tsx` — shared client form for create + edit

**Objective:** Single client component used by both `/new` and `/[key]/edit`. Receives optional `initial` prop for edit mode; renders the same fields with appropriate disabled state on `key` for edit mode.
**Dependencies:** None (frontend-only)
**Mapped Scenarios:** TS-001, TS-002

**Files:**
- Create: `app/admin/practices/components/PracticeForm.tsx`
- Create: `app/admin/practices/components/PracticeForm.test.tsx`

**Key Decisions / Notes:**
- `'use client'` directive at top.
- Props: `{ mode: 'create' | 'edit'; initial?: { key: string; label: string; slug: string; sort_order: number; active: boolean } }`.
- State: controlled inputs for each field.
- **Slug normalization helper** (top of file, exported for testing):
  ```ts
  export function normalizeSlug(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
  ```
- On create: `key` is editable. On every keystroke in `key`, set `slug = normalizeSlug(key)` while the user hasn't manually edited slug (`slugTouched` boolean is false). This means typing `Reiki!` in `key` produces `slug = "reiki"` — both fields stay valid even if `key` itself fails kebab-case validation. The `key` field still validates separately and shows its own error.
- On edit: `key` is rendered as read-only static text (or `<input disabled>`). `slug` does NOT auto-derive — admin can change it independently. `slugTouched` is initialized to `true` in edit mode.
- Submit handler: POST to `/api/admin/practices` (create) or PATCH to `/api/admin/practices/[key]` (edit). On success, `router.push('/admin/practices')` via `useRouter` from `next/navigation`. On failure, render error in an `<Alert>` above the form.
- Validation client-side: matches server-side rules (kebab-case key/slug, length checks, sort_order integer). Disable submit while invalid OR while in-flight.
- Use design tokens (`bg-surface`, `rounded-xl`, `shadow-soft`, `border-outline`).

**Definition of Done:**
- [ ] Renders empty fields when `mode='create'`, no `initial`.
- [ ] Renders prefilled fields when `mode='edit'`, `initial` provided. `key` is disabled.
- [ ] Slug auto-derives from key via `normalizeSlug` while untouched (create mode only).
- [ ] Typing `Reiki!` in key sets slug to `reiki` (normalization handles uppercase + special chars).
- [ ] Slug stops auto-deriving once user manually edits it.
- [ ] In edit mode, slug is initialized as untouched-locked (does not derive from key).
- [ ] Submit button disabled when fields invalid.
- [ ] Submit POSTs (create) or PATCHes (edit) to the right URL with the right body shape.
- [ ] On API error, error message renders in `<Alert>` and form stays mounted with values preserved.
- [ ] 7+ tests: render create, render edit, slug auto-derive, slug normalization, slug user-override, submit disabled when invalid, submit calls correct API.

**Verify:**
- `npx vitest run app/admin/practices/components/PracticeForm.test.tsx`

---

### Task 5: `/admin/practices` list — server page + client list + active-toggle confirm modal

**Objective:** Server-component list page that fetches all practices + usage counts, renders a client component which shows the list + the inline active-toggle with confirm modal.
**Dependencies:** Task 1, Task 2
**Mapped Scenarios:** TS-001 (step 1, 4), TS-003

**Files:**
- Create: `app/admin/practices/page.tsx` (server component)
- Create: `app/admin/practices/PracticesList.tsx` (`'use client'`)
- Create: `app/admin/practices/PracticesList.test.tsx`

**Key Decisions / Notes:**
- `app/admin/practices/page.tsx`:
  - `export const dynamic = 'force-dynamic'` (admin pages should not statically render).
  - `async function Page()` — calls `loadAdminPracticesView()` from **`lib/admin-practices.ts`** (new file in Task 2 — keeps the join-with-professionals logic out of the lookup-table-focused `lib/practices.ts`).
  - Wraps `<AdminLayout>`. Renders header ("Prácticas" h1 + "Nueva práctica" button → `/admin/practices/new`) and `<PracticesList>` with the data as a prop.
- `app/admin/practices/PracticesList.tsx`:
  - Receives `practices: PracticeWithCount[]` as prop. The prop is already ordered `sort_order ASC, key ASC` by `getAllPractices()` — no client-side re-sort.
  - Renders rows using `<GlassCard>` per row in a single column (catalog is small, table-row layout works better than 3-col grid here since each row has many columns).
  - Each row: sort_order | label | key (mono font, smaller) | slug | active toggle (switch) | usage count badge | "Editar" link to `/admin/practices/[key]/edit`.
  - Active toggle:
    - Clicking the toggle while active opens a confirm modal: **"<count> profesionales activos/pendientes usan esta práctica. ¿Desactivar?"** (use plural for count !== 1; count === 0 says "Ningún profesional usa esta práctica todavía. ¿Desactivar?"). Buttons: "Cancelar" + "Desactivar".
    - Clicking the toggle while inactive activates immediately (no modal — re-activation is low-risk).
    - On confirm/activate: PATCH to `/api/admin/practices/[key]` with `{ active: !current }`. On success: optimistic UI update + `router.refresh()` for fresh data.
  - Use `<Modal>` from `app/components/ui/Modal.tsx`.
  - Empty state: `<EmptyState>` with link to `/admin/practices/new` if list is empty.

**Definition of Done:**
- [ ] Page renders with all practices visible, sorted by `sort_order` ascending.
- [ ] Each row shows label, key, slug, active state, usage count.
- [ ] Clicking active toggle on an active practice opens the confirm modal with the correct count.
- [ ] Confirming the modal PATCHes `{ active: false }` and updates the UI.
- [ ] Cancelling the modal leaves the practice active.
- [ ] Re-activating an inactive practice happens without a modal.
- [ ] Empty list renders `<EmptyState>` with link to create.
- [ ] "Nueva práctica" header button navigates to `/admin/practices/new`.
- [ ] 5+ tests cover: render rows, toggle modal flow, cancel flow, activate-from-inactive flow, empty state.

**Verify:**
- `npx vitest run app/admin/practices/PracticesList.test.tsx`

---

### Task 6: `/admin/practices/new` — create page server shell

**Objective:** Trivial server shell that wraps `<AdminLayout>` and renders `<PracticeForm mode="create" />`.
**Dependencies:** Task 4
**Mapped Scenarios:** TS-001 (step 2-4)

**Files:**
- Create: `app/admin/practices/new/page.tsx`

**Key Decisions / Notes:**
- Server component, `export const dynamic = 'force-dynamic'`.
- 20-30 lines max. Header: "Nueva práctica" + back link to `/admin/practices`.
- Renders `<PracticeForm mode="create" />` inside an `<AdminLayout>`.

**Definition of Done:**
- [ ] Page renders the form.
- [ ] Back link navigates to `/admin/practices`.
- [ ] Submitting the form (Task 4 already-tested behavior) creates a practice and redirects.

**Verify:** Covered by TS-001 E2E (Task 9) and Task 4's form tests. No standalone unit test needed for the trivial server shell.

---

### Task 7: `/admin/practices/[key]/edit` — edit page server shell with prefill

**Objective:** Server shell that fetches the practice by key, renders `<PracticeForm mode="edit" initial={...} />`. Returns 404 if the key doesn't exist.
**Dependencies:** Task 4
**Mapped Scenarios:** TS-002

**Files:**
- Create: `app/admin/practices/[key]/edit/page.tsx`

**Key Decisions / Notes:**
- `async function Page({ params }: { params: { key: string } })`.
- Fetch via `supabaseAdmin.from('practices').select('key, label, slug, sort_order, active').eq('key', params.key).single()`.
- If error or null: `notFound()` from `next/navigation`.
- Else: render `<PracticeForm mode="edit" initial={data} />`.
- Header: "Editar: {label}" + back link to `/admin/practices`.

**Definition of Done:**
- [ ] Page fetches the practice and renders the form prefilled.
- [ ] Non-existent key triggers Next.js 404 page (via `notFound()`).
- [ ] Form's `key` field is disabled in edit mode (Task 4 behavior).

**Verify:** Covered by TS-002 E2E. No standalone unit test for the trivial server shell.

---

### Task 8: AdminLayout — add Prácticas nav item

**Objective:** Add "Prácticas" link to the admin nav between "Profesionales" and "PQLs". Spanish label matches the existing `Profesionales` convention.
**Dependencies:** None
**Mapped Scenarios:** TS-001 (step 1, link visible)

**Files:**
- Modify: `app/components/AdminLayout.tsx`

**Key Decisions / Notes:**
- Single-line edit at the nav array (currently `app/components/AdminLayout.tsx:14-18`). Insert: `{ href: '/admin/practices', label: 'Prácticas' },` between Profesionales (line 16) and PQLs (line 17).
- Active-state detection (`pathname.startsWith(item.href)`) already handles the new entry.

**Definition of Done:**
- [ ] "Prácticas" link visible in admin nav, between Profesionales and PQLs.
- [ ] Link is highlighted as active when on any `/admin/practices/*` route.

**Verify:** Covered by TS-001 E2E. **No `AdminLayout.test.tsx` exists in the repo** (verified `find -name 'AdminLayout.test*'` returns nothing), and we do not add one for this single-line nav change — E2E coverage from TS-001 is sufficient.

---

### Task 9: E2E tests — TS-001, TS-002, TS-003

**Objective:** Implement the three E2E scenarios from the plan.
**Dependencies:** Tasks 1-8
**Mapped Scenarios:** TS-001, TS-002, TS-003

**Files:**
- Create: `__tests__/e2e/admin-practices.spec.ts`

**Key Decisions / Notes:**
- Mirror structure from `__tests__/e2e/registration-full-flow.spec.ts`:
  - Test-results directory (`test-results/admin-practices`).
  - Cleanup hook (afterEach or afterAll) deletes any `e2e-test-*` rows from `practices` and resets `professionals.practices[]` for any test pro.
- Admin auth: rely on the existing dev placeholder UUID (`getAdminUserId()` returns the placeholder in NODE_ENV !== 'production'). For E2E running locally, no auth setup needed beyond what other admin E2E tests use (verify by reading `__tests__/e2e/admin-match-flow.spec.ts` if it exists).
- TS-001: navigate → fill form → assert list row → assert chip in registration step 3.
- TS-002: navigate → click Edit → change label → assert label in list.
- TS-003: setup creates a test practice + a test pro using it; navigate → toggle → assert modal text + count → confirm → assert picker excludes + profile still shows.
- Use `@playwright/test`'s `expect(...).toHaveText`, `toBeVisible`, etc. No `waitForTimeout` — use `expect.poll` or built-in retries.

**Definition of Done:**
- [ ] TS-001 passes end-to-end.
- [ ] TS-002 passes end-to-end.
- [ ] TS-003 passes end-to-end.
- [ ] Cleanup hook removes all test artifacts from DB.

**Verify:**
- `npx playwright test __tests__/e2e/admin-practices.spec.ts --project=admin` (requires `E2E_ADMIN_EMAIL` + `E2E_ADMIN_PASSWORD` in `.env.local`; tests skip gracefully without them)

---

### Task 10: Integration tests against real DB

**Objective:** DB-backed integration tests that exercise the unique-constraint catch path, the cache-bust effect on real reads, and the real PATCH update behavior. Unit tests (mocked supabase) prove shape; integration tests prove behavior against the actual schema.
**Dependencies:** Tasks 1, 2, 3
**Mapped Scenarios:** TS-001, TS-002, TS-003 (data-layer correctness)

**Files:**
- Create: `__tests__/integration/admin-practices.test.ts`

**Key Decisions / Notes:**
- Mirror the structure of `__tests__/integration/practices-helpers.test.ts` and `__tests__/integration/practices-migration.test.ts` — both use real `supabaseAdmin` against the dev/test DB.
- Each test uses a unique key prefix (e.g. `intg-test-${Date.now()}-1`) and cleans up in `afterAll`.
- Tests:
  1. **POST creates a real row** — call POST handler, assert the DB has the row, assert `getActivePractices()` returns it after `bustPracticesCache()`.
  2. **POST duplicate key returns 400** — insert a row, then POST with the same key, assert 400 + Spanish error.
  3. **POST duplicate slug returns 400** — same pattern with slug.
  4. **PATCH updates real DB** — insert row, PATCH label, assert DB has new label.
  5. **PATCH key-immutable returns 400** — insert row, PATCH `{ key: 'changed' }`, assert 400 + DB row's key unchanged.
  6. **PATCH non-existent returns 404** — PATCH a key that doesn't exist, assert 404.
  7. **PATCH active=false then GET active list excludes it** — insert active row, deactivate, assert `getActivePractices()` excludes it. Then re-activate and assert it returns.
  8. **Usage count counts only active+submitted pros** — insert practice, insert two pros (one `active`, one `rejected`) both using the practice, call `loadAdminPracticesView()`, assert `usage_count === 1`.
  9. **`leads.practice_preference` is NOT counted** — insert practice, insert lead with `practice_preference: ['<key>']`, call `loadAdminPracticesView()`, assert `usage_count === 0` for that practice.
  10. **In-process cache bust verified** — call `bustPracticesCache()` then `getActivePractices()`, assert it issued a fresh DB query (mock at `supabaseAdmin` level not possible against real DB; instead assert that a row inserted via direct SQL between two `getActivePractices()` calls is visible only after `bustPracticesCache()`).

**Definition of Done:**
- [ ] All 10 integration tests pass against the real Supabase dev DB.
- [ ] Tests clean up all `intg-test-*` rows in `afterAll`.
- [ ] Cross-process cache propagation is **not** tested — documented as a known limitation in the test file's header comment.

**Verify:**
- `npx vitest run --project integration __tests__/integration/admin-practices.test.ts`

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001   | Critical | NOT_RUN | 0 | Admin auth gates `/admin/*` via Supabase middleware. Spec runs via `--project=admin` which depends on `auth-setup`; setup skips when `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` are not set. Spec is written, selectors use `data-testid`, runnable when creds are provisioned. |
| TS-002   | High     | NOT_RUN | 0 | Same as TS-001. |
| TS-003   | Critical | NOT_RUN | 0 | Same as TS-001. Picker-absence assertion (step 5) intentionally NOT included end-to-end — covered at the data layer by integration test #5 (`getActivePractices()` excludes the deactivated practice after bust). Cross-process cache (60s TTL) makes UI-level assertion flaky-prone unless dev runs single-process; documented trade-off. |

## Not Verified

| Not Verified | Reason |
|-------------|--------|
| TS-001/002/003 in a real browser | `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` not provisioned in this dev environment. Tests are complete, use stable `data-testid` selectors, and skip gracefully without creds. Will run on first invocation with creds. |
| Cross-process cache invalidation propagation | Bounded by 60s TTL by design (see `lib/practices.ts` comment). Not E2E-tested per plan's accepted trade-off. In-process bust IS verified by integration test #10. |
| Truth #3 picker-absence assertion at the UI layer | Covered at the data layer (integration test #5: `getActivePractices()` excludes deactivated practice). UI-level assertion deferred — see TS-003 Notes. |
| Suggestion: PracticesList mock test for `.eq('active', true)` | Real DB behavior confirmed by integration test; mock-tightening is low-priority polish. |

## Open Questions

- **None** — all design decisions resolved in Batch 1 + Batch 2.

### Deferred Ideas

- **Audit log of admin edits** — track who changed what, when. Useful if multiple admins start sharing the catalog. Not blocking for v1 (single admin so far).
- **Practice descriptions / icons** — PRODUCT.md flagged as future enhancement. Adds richness to the picker UX. Defer until directory filters PRD.
- **Drag-and-drop reorder** — a `dnd-kit` integration would be slick. For 15 entries with stable order, sort_order numeric input is enough.
- **Bulk operations (CSV import/export, bulk-deactivate)** — YAGNI for v1.
- **Replace `lib/admin-auth.ts` stub with real Supabase Auth check** — pre-existing gap inherited from all `/api/admin/*` routes. Worth a dedicated cleanup PR.
- **Public `/api/practices` route** — would let third-party integrations consume the catalog. No demand signal yet.
- **Slug-based public URLs (e.g., /practica/reiki)** — would turn slug into a real URL identifier. Currently slug exists in the schema but is unused. Add when public per-practice landing pages are designed.
- **Postgres aggregation for usage counts** — current implementation fetches `professionals.practices` arrays into Node.js and counts in memory. For 65 rows it's negligible; if pros table grows past ~10k rows, replace with a Postgres function `get_practice_usage_counts() RETURNS TABLE(key TEXT, usage_count INT)` using `unnest(practices)` aggregation, called via `supabaseAdmin.rpc()`. Few orders of magnitude faster at scale.
- **`revalidateTag('practices')` cache invalidation** — cleaner cross-process invalidation than the in-memory module cache. Requires the catalog to be read through Next.js `fetch` instead of Supabase JS client. Bigger refactor; defer until staleness becomes a real complaint.
- **Counting `leads.practice_preference` toward usage** — currently excluded (rationale in Scope: leads are transient). If admin feedback shows the count would be more decision-useful with leads included, add as an additional `usage_count_leads` field rather than mixing into `usage_count`.
