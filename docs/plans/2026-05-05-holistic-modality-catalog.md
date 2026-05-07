# Holistic Practice Catalog Implementation Plan

Created: 2026-05-05
Author: belu.montoya@dialpad.com
Status: VERIFIED
Verified: 2026-05-07 by belu.montoya@dialpad.com (manual smoke + spec-verify gate approval)
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Replace the three hardcoded psychotherapy `STYLE_*` constants with a DB-driven `practices` catalog of 15 holistic-wellness practices, rename the `style[]` columns on `professionals` and `leads` to `practices[]`/`practice_preference[]`, mark all 45 existing pros for admin re-classification, and unify the picker UI behind a shared `<PracticePicker>` component.

**Architecture:** New `practices` table (key, label, slug, sort_order, active, created_at) becomes the source of truth. Server components fetch the catalog via `getActivePractices()`; client-side forms (`/profesionales/registro`, `/solicitar`) become server-shell + client-form-child pairs that receive `practices` as a prop. The admin review page (currently fully client-side) gets the catalog by extending the existing `GET /api/admin/professionals/[id]` response. Shared `<PracticePicker>` component renders the chip multi-select on all three picker surfaces (registro, solicitar, admin re-classification banner).

**Tech Stack:** Next.js 14.2 App Router, TypeScript, Supabase (Postgres), Tailwind v4, Vitest (unit + integration), Playwright (E2E).

> **Naming note:** The PRD originally proposed `modalities` as the column/catalog name. During spec-plan exploration we discovered that `professionals.modality TEXT[]` (online/presencial format) and `leads.modality_preference TEXT[]` already exist. To avoid the singular/plural footgun and the SQL collision (`leads.modality_preference` cannot be created — it already exists), the user chose `practices` / "Práctica" as the term for the new field. The 15 seed values themselves (keys: `reiki`, `constelaciones-familiares`, etc.) are unchanged. See PRD for the substitution table.

## Scope

### In Scope

- New `practices` table with v1 columns: `key text primary key`, `label text not null`, `slug text unique not null`, `sort_order int not null default 0`, `active bool not null default true`, `created_at timestamptz default now()`.
- Migration `010_holistic_practices_catalog.sql` that:
  - Creates `practices` table.
  - Seeds 15 rows (canonical list per PRD).
  - Renames `professionals.style` → `professionals.practices` and `leads.style_preference` → `leads.practice_preference`.
  - Sets `professionals.practices = '{}'` for all rows (~45 pros).
  - Adds `professionals.needs_practice_review boolean not null default false` and sets `= true` for all existing pros.
- Delete `STYLE_MAP` from `lib/design-constants.ts`. Delete `STYLES` from registro page and `STYLE_OPTIONS` from solicitar page.
- New file `lib/practices.ts` with `Practice` type, `getActivePractices()` server helper, `validatePracticeKeys(keys: string[])` validator.
- New file `app/components/PracticePicker.tsx` — `'use client'` shared chip multi-select used by registro form, solicitar form, and admin re-classification banner. Props: `practices: Practice[]`, `selected: string[]`, `onChange: (next: string[]) => void`, `label: string`, `helperText?: string`, `includeNoPreference?: boolean`. Controlled component — does not own state. When `includeNoPreference=true`, renders the "No tengo preferencia" pill and enforces mutual exclusion (selecting it clears `selected`; selecting any practice is implicitly "preference set").
- Refactor `app/profesionales/registro/page.tsx` into:
  - `app/profesionales/registro/page.tsx` — server component; calls `getActivePractices()`; renders `<RegistroForm practices={...} />`.
  - `app/profesionales/registro/RegistroForm.tsx` — `'use client'`, holds today's `useState` form body; field `style: string[]` → `practices: string[]`; uses `<PracticePicker>` instead of inline `STYLES.map(...)`; label "Estilo terapéutico" → "Práctica".
- Refactor `app/solicitar/page.tsx` into:
  - `app/solicitar/page.tsx` — server component; calls `getActivePractices()`; renders `<SolicitarForm practices={...} />`.
  - `app/solicitar/SolicitarForm.tsx` — `'use client'`, holds today's body; state `stylePreference` → `practicePreference`; uses `<PracticePicker>` with `includeNoPreference`; passes `practice_preference` (renamed) to `createLead`.
- Update `POST /api/professionals/register` (route.ts):
  - Read `practices` from FormData (renamed from `style`).
  - Call `validatePracticeKeys()` — return 400 with the offending key if invalid.
  - Insert `practices` field instead of `style`.
- Update `createLead` server action (`app/actions/create-lead.ts`):
  - Rename input `style_preference` → `practice_preference`.
  - Call `validatePracticeKeys()` — throw if invalid.
  - Insert `practice_preference` field instead of `style_preference`.
- Update `GET /api/admin/professionals/[id]`:
  - Return `{ professional, practices }` where `practices` is the active catalog.
- Add PATCH handling on `/api/admin/professionals/[id]` for practices-only updates (parallel to existing specialty-only path):
  - When body has `practices` and no `action`, validate keys, update `professionals.practices` and clear `needs_practice_review = false` in one update.
- Update `app/admin/professionals/[id]/review/page.tsx`:
  - Type field `style: string[] | null` → `practices: string[]`.
  - Drop `STYLE_MAP` import.
  - Build label map from fetched `practices` catalog.
  - Render re-classification banner when `professional.needs_practice_review === true`. Banner uses `<PracticePicker>` and "Guardar prácticas" button; save calls extended PATCH and refetches.
  - Section heading "Enfoque terapéutico" → "Prácticas".
- Update `app/p/[slug]/page.tsx`:
  - SELECT `practices` from DB instead of `style`.
  - Drop `STYLE_MAP` import; build label map from fetched `practices` catalog.
  - Section heading: "Prácticas" (was "Enfoque terapéutico" / "Estilos").
- Update existing E2E tests `__tests__/e2e/registration-flow.spec.ts` and `registration-full-flow.spec.ts` to use the new field name.

### Out of Scope

- **Submission/review workflow** — pros suggesting new practices, admin merging duplicates / rejecting too-specific. Deferred to a follow-up PRD; the table schema is forward-compatible (`status`, `submitted_by`, `merged_into` columns can be added in a non-breaking migration).
- **Admin CRUD UI for the `practices` table** — for v1, admin edits seed list via SQL or Supabase Studio. UI editor is part of the deferred PRD.
- **Per-market localization** — labels are Argentine Spanish. Spain/México use the same labels for v1.
- **Search/ranking changes** — directory ordering and concierge match logic stay the same. Only the universe of allowed values changes.
- **Backfill of legacy `style[]` values** — we are not auto-mapping `cognitive-behavioral` → anything. All 45 pros are cleared via the migration and admin re-classifies manually using the banner.
- **Public `/api/practices` route** — admin gets the catalog via the extended professional endpoint; user-facing forms get it via server-component prop drilling. A public route is YAGNI for v1.
- **`revalidateTag('practices')` on admin SQL edits** — for v1, restart the deploy after editing the catalog (acknowledged trade-off in PRD).
- **Comprehensive E2E** — only the registration flow E2E gets updated. Solicitar, admin banner, and public profile flows have integration test coverage but not new browser E2E (Standard test depth, locked in Batch 1).

## Approach

**Chosen:** (A) Linear, single-PR with TDD per task.

**Why:** The migration is the foundation; everything else builds on it. Backwards-compat shims (vertical slices) would pay maintenance tax for a mergeability benefit we don't need on a one-week feature. Big-bang would compress the diff into one massive review. Linear-with-TDD keeps each task verifiable on its own while shipping atomically.

**Alternatives considered:**
- **(B) Vertical slices** — three smaller PRs (read paths first, then writes, then banner). Adds a backwards-compat shim that reads either `style` or `practices`; the cost outweighs the benefit when no incremental ship pressure exists.
- **(C) Big bang** — single commit landing the whole diff. Mergeable but harder to review for a 12-task chain with a destructive migration.

## Context for Implementer

- **Patterns to follow:**
  - Server-shell + client-form-child pattern: today's `app/p/[slug]/page.tsx:1-149` is the closest server-component reference (Supabase fetch + props down to children). The refactor of registro/solicitar mirrors this shape.
  - Specialty-only PATCH path: `app/api/admin/professionals/[id]/route.ts:79-101` shows the parallel-update pattern. Add a practices-only path in the same file with the same shape.
  - Specialty editor in admin review: `app/admin/professionals/[id]/review/components/SpecialtyMapper.tsx` is the closest UX reference for the re-classification banner; the new banner is structurally similar but uses `<PracticePicker>` and triggers a different PATCH path.
  - Service-role writes: `app/api/professionals/register/route.ts` and `app/actions/create-lead.ts` show the `supabaseAdmin.from(...).insert(...)` pattern. New writes go through these existing entry points; no new API routes needed.
- **Conventions:**
  - Spanish copy is Argentine informal: "Práctica", "Prácticas", "Guardar prácticas". Never "tú", always "vos".
  - Errors logged via `lib/monitoring.ts` (`logError`), never `console.log`.
  - Design tokens: `bg-brand`, `text-brand`, `bg-surface`, `border-outline`, `bg-warning-weak`, `text-warning` for the banner. No hex.
  - Tailwind chip pattern: existing chip styling in registro form (`px-4 py-2 rounded-full text-sm font-medium`) is the reference for `<PracticePicker>` chips.
  - Migration files numbered sequentially (`010_*.sql` is next).
- **Key files:**
  - `migrations/001_schema.sql:19-49` — original schema definitions for `professionals.modality`, `professionals.style`, `leads.modality_preference`, `leads.style_preference`. **Read first** before writing the migration.
  - `lib/design-constants.ts:80-114` — keep `SPECIALTY_MAP`, `MODALITY_MAP`, `SERVICE_TYPE_MAP`, `STATUS_CONFIG`, `RANK_LABELS`. Only `STYLE_MAP` (lines 124-134) gets removed.
  - `lib/profile-score.ts:23,115` — uses `modality` (delivery format), NOT `style`. The rename has zero impact on profile scoring. Confirmed.
  - `app/api/admin/professionals/[id]/route.ts` — extend GET response and add practices-only PATCH path. Existing route.test.ts must continue passing.
- **Gotchas:**
  - **Naming collision risk** (the reason this PRD was amended): `professionals.modality TEXT[] NOT NULL` (online/presencial) coexists with the new `professionals.practices TEXT[]` (holistic catalog). They are *different* fields — be careful in SQL queries. UI labels disambiguate: "Modalidad de atención" (existing, format) vs "Práctica" (new, holistic).
  - **`leads.modality_preference` already exists** (`migrations/001_schema.sql:44`) — for online/presencial filter. Do NOT reuse this column. The new column is `leads.practice_preference`.
  - **`STYLE_MAP` had legacy keys** (`cbt`, `psychodynamic`, `integrative`) the registration form never offered (drift). After migration these stop appearing; no fallback rendering needed because the migration clears all `style[]` data via the rename + `'{}'` reset.
  - **Existing E2E tests submit a `style` field** in the registration form. They will break after Task 4 (registro refactor) until Task 12 (E2E test update). Run them last in the chain or run only after the full chain is in place.
  - **Admin review page is `'use client'`** — fetches via `useEffect` + `fetch('/api/admin/professionals/[id]')`. The PRD's "server-component fetch" framing is wrong for this page; we extend the existing GET response instead.
- **Domain context:** Hará's pivot (Apr 2026) shifted positioning from psychotherapy to holistic-wellness. The codebase still encodes the pre-pivot taxonomy in three places. This PRD eliminates that drift and sets up a forward-compatible catalog for the deferred submission/review workflow (where pros can suggest new practices and admin merges/rejects them).

## Runtime Environment

- **Start command:** `npm run dev` (port 3000)
- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **Tests:** `npm run test:integration` (Vitest, integration project), `npm run test:e2e` (Playwright)
- **Migration application:** Migrations are applied manually against Supabase in this codebase (no automated migrate command). Run `010_*.sql` against the project's Supabase SQL editor or via `psql`. The plan task verifies post-migration state via an integration test that connects to the test DB.

## Assumptions

- The existing `npm run test:integration` setup connects to a test Supabase instance with seedable state. Supported by `package.json` scripts and the existence of `__tests__/integration/` files. Tasks 1, 2, 6, 7, 8 depend on this.
- All 45 production pros currently have `professionals.style[]` populated with legacy psychotherapy values (or NULL). The PRD claims 45 pros; the migration sets `practices = '{}'` and `needs_practice_review = true` for all rows regardless of count, so the exact number doesn't gate correctness. Tasks 1 and 9 depend on this.
- `professionals.style` is nullable today (`migrations/001_schema.sql:21`). After rename, we promote it to `NOT NULL DEFAULT '{}'` for cleaner TS typing — a small data-shape improvement piggy-backed onto the rename. Documented as a design decision below; affects Task 1.
- The existing PATCH endpoint's specialty-only path (no `action` field) is a stable pattern. Task 8 mirrors it for practices.
- Existing E2E tests (`registration-flow.spec.ts`, `registration-full-flow.spec.ts`) submit the `style` field by name. They need updating in lockstep with Task 4. Task 12 covers this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Migration fails on production due to data state we didn't anticipate (e.g., a pro has a NULL `style` already) | Low | High | Migration uses `UPDATE professionals SET practices = '{}'` (handles NULL) and `WHERE TRUE` (covers all rows). Verified by Task 1 integration test. |
| `professionals.modality` (existing, format) gets confused with `professionals.practices` (new) in a future SQL query or code review | Medium | Medium | Naming chosen explicitly to disambiguate (PRD amendment). Plan documents the gotcha. Code change is isolated to write paths; reads use distinct label maps. |
| Existing E2E tests fail before Task 12 lands, blocking the full TDD chain | High | Low | Task 12 is sequenced before Task 11's verify step. The chain is one PR, so the failing E2E never reaches main. Local dev uses `npm run test:e2e` only after the full chain is checked in. |
| Data flow silently broken mid-chain (form sends new field name; API still expects old field name) | Medium → Eliminated | High → Low | Tasks 4–7 are explicitly ordered to pair each form refactor with its corresponding write-path update: 4 (registro form) → 5 (register API) → 6 (solicitar form) → 7 (createLead). After each pair, the data flow is end-to-end consistent. Task dependencies in the plan enforce this order. Verifying in dev after Task 5 (registro+API) or Task 7 (solicitar+createLead) requires submitting the form and checking the DB row contains the practices — call this out as a manual smoke step at those checkpoints. |
| Server-side validation rejects keys the UI just selected (e.g., during transitional cache window after admin edits the catalog) | Low | Medium | Validation happens against the same Supabase read; UI fetches at render time, so the window is single-request. Documented as a known small race. |
| Playwright tests time out because the dev server picks up the new server-component pages slowly | Low | Low | If observed, increase Playwright `expect.timeout` for affected specs in Task 12. Standard mitigation. |
| `<PracticePicker>` chip styling drifts from registro/solicitar's existing design once unified | Low | Low | Component test (Task 3) renders chips and asserts `bg-brand` (selected) / `bg-surface` (unselected) classes. Visual consistency owned by component code, not by callers. |

## Goal Verification

### Truths

1. The `practices` table exists with 15 rows in `sort_order` order, `active = true`, and the canonical 15 keys/labels per the PRD seed list. **Artifact:** `migrations/010_holistic_practices_catalog.sql`, integration test result.
2. `professionals.style` is gone; `professionals.practices TEXT[] NOT NULL DEFAULT '{}'` exists. `leads.style_preference` is gone; `leads.practice_preference TEXT[]` exists. **Artifact:** `migrations/010_*.sql`, post-migration `\d professionals` / `\d leads` output.
3. All existing professionals have `practices = '{}'` and `needs_practice_review = true`. **Artifact:** integration test running `SELECT COUNT(*) FROM professionals WHERE needs_practice_review = false` returns 0.
4. The three constants (`STYLE_MAP`, `STYLES`, `STYLE_OPTIONS`) are absent from the codebase; no file imports them. **Artifact:** `grep -r 'STYLE_MAP\|STYLES\|STYLE_OPTIONS' app lib` returns no matches outside test descriptions.
5. A pro registering at `/profesionales/registro` can pick practices from a chip multi-select, submit, and the resulting `professionals.practices` row contains the selected keys. **Artifact:** TS-001 passes end-to-end via Playwright.
6. A user on `/solicitar` can pick practice preferences (multi-select) or "No tengo preferencia" (mutually exclusive with multi-select), submit, and `leads.practice_preference` reflects the choice (empty array for "no preference"). **Artifact:** TS-002 passes end-to-end.
7. An admin opening `/admin/professionals/[id]/review` for a flagged pro sees a re-classification banner; selecting practices and saving updates `professionals.practices` and clears `needs_practice_review`. **Artifact:** TS-003 passes end-to-end. PATCH integration test confirms the DB state.
8. The public profile `/p/[slug]` and admin review display practice labels via the catalog (no `STYLE_MAP` lookup). Unknown keys fall back to the raw key. **Artifact:** TS-004 passes; visual smoke on a re-classified pro.
9. `POST /api/professionals/register` rejects payloads with unknown practice keys with a 400 and includes the offending key in the error body. **Artifact:** TS-005 passes; route integration test.

### Artifacts

- `migrations/010_holistic_practices_catalog.sql` — schema + seed + rename + flag.
- `lib/practices.ts` — `Practice` type, `getActivePractices()`, `validatePracticeKeys()`.
- `app/components/PracticePicker.tsx` — shared chip multi-select.
- `app/profesionales/registro/page.tsx` (server) + `app/profesionales/registro/RegistroForm.tsx` (client).
- `app/solicitar/page.tsx` (server) + `app/solicitar/SolicitarForm.tsx` (client).
- `app/api/professionals/register/route.ts` — extended write path.
- `app/actions/create-lead.ts` — extended write path.
- `app/api/admin/professionals/[id]/route.ts` — extended GET + PATCH.
- `app/admin/professionals/[id]/review/page.tsx` — banner + display.
- `app/p/[slug]/page.tsx` — read path.
- Integration tests in `__tests__/integration/`, component test for `<PracticePicker>`, updated E2E specs.

## E2E Test Scenarios

### TS-001: New pro registers with practices

**Priority:** Critical
**Preconditions:** Dev server running. `practices` table seeded with 15 rows. Test mailbox / phone available for the form.
**Mapped Tasks:** Task 1, Task 3, Task 4, Task 5, Task 12

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profesionales/registro` | Step-1 form renders. No console errors. |
| 2 | Fill required fields, advance to step 2 | Step 2 shows "Modalidad de atención" (existing field) above the new "Práctica" picker. |
| 3 | Click two practice chips (e.g., `reiki`, `meditacion-mindfulness`) | Both chips show selected (`bg-brand` style). |
| 4 | Continue through bio step and submit | Redirect to `/profesionales/registro/confirmacion`. |
| 5 | Query DB: `SELECT practices FROM professionals WHERE email = '<test-email>'` | Returns `{reiki, meditacion-mindfulness}`. |

### TS-002: User submits concierge with practice preference

**Priority:** Critical
**Preconditions:** Dev server. `practices` table seeded.
**Mapped Tasks:** Task 1, Task 3, Task 6, Task 7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/solicitar` | Page loads; intent tags + location + WhatsApp visible. |
| 2 | Open the "Avanzado" section | "Práctica preferida" picker visible with 15 chips + "No tengo preferencia" pill. |
| 3 | Select `reiki` and `terapia-floral` | Both chips highlighted; "No tengo preferencia" remains unselected. |
| 4 | Click "No tengo preferencia" | Both chip selections clear; "No tengo preferencia" becomes the active state. |
| 5 | Click `reiki` again | "No tengo preferencia" deselects automatically; `reiki` becomes the only selection. |
| 6 | Fill remaining required fields and submit | Redirect to `/gracias`. |
| 7 | Query DB: `SELECT practice_preference FROM leads ORDER BY created_at DESC LIMIT 1` | Returns `{reiki}`. |

### TS-003: Admin re-classifies a flagged pro

**Priority:** Critical
**Preconditions:** Logged in as admin. At least one pro with `needs_practice_review = true` and `practices = '{}'`.
**Mapped Tasks:** Task 1, Task 3, Task 8, Task 9

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/professionals/[id]/review` for a flagged pro | Re-classification banner renders at the top of the page (before contact details), with text "Esta profesional necesita re-clasificación al nuevo catálogo holístico." and a `<PracticePicker>`. |
| 2 | Select two practices (e.g., `constelaciones-familiares`, `registros-akashicos`) | Chips highlight as selected. |
| 3 | Click "Guardar prácticas" | Loading state, then banner disappears. The "Prácticas" section in the profile body shows the two selected labels. |
| 4 | Refresh the page | Banner does not return. Practices still display. |
| 5 | Query DB: `SELECT practices, needs_practice_review FROM professionals WHERE id = '<id>'` | Returns `{constelaciones-familiares,registros-akashicos}`, `false`. |

### TS-004: Public profile renders practices from catalog

**Priority:** High
**Preconditions:** A re-classified pro with practices set.
**Mapped Tasks:** Task 10

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/p/<slug>` of the re-classified pro | Page loads, "Prácticas" section visible. |
| 2 | Inspect rendered labels | Match the catalog labels (e.g., "Constelaciones familiares", "Registros akáshicos"). |
| 3 | Confirm a flagged-but-not-yet-classified pro shows no Prácticas section | Page renders without a Prácticas section (empty array → no header). |

### TS-005: API rejects unknown practice keys

**Priority:** Medium
**Preconditions:** Dev server.
**Mapped Tasks:** Task 5, Task 7, Task 8

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | POST `/api/professionals/register` with `practices: ["definitely-not-a-key"]` (other required fields valid) | Response status 400. Body includes `error: "Práctica inválida: definitely-not-a-key"`. No row inserted. |
| 2 | Call `createLead` with `practice_preference: ["another-fake-key"]` | Throws an error matching `/Práctica inválida/`. No row inserted in `leads`. |
| 3 | PATCH `/api/admin/professionals/[id]` with `{ practices: ["nope"] }` | Response 400. `needs_practice_review` unchanged. |

## Progress Tracking

- [x] Task 1: Migration 010 — schema, seed, rename, flag
- [x] Task 2: `lib/practices.ts` — type + getActivePractices() + validatePracticeKeys()
- [x] Task 3: `<PracticePicker>` shared component
- [x] Task 4: Refactor `/profesionales/registro` into server-shell + RegistroForm
- [x] Task 5: `/api/professionals/register` accepts `practices`, validates keys
- [x] Task 6: Refactor `/solicitar` into server-shell + SolicitarForm
- [x] Task 7: `createLead` action accepts `practice_preference`, validates keys
- [x] Task 8: `/api/admin/professionals/[id]` extended GET + practices-only PATCH path
- [x] Task 9: Admin review page — banner + display label rename
- [x] Task 10: Public profile (`/p/[slug]`) renders practices from catalog
- [x] Task 11: Remove `STYLE_MAP` from `lib/design-constants.ts`
- [x] Task 12: Update existing E2E specs for renamed field

**Total Tasks:** 12 | **Completed:** 12 | **Remaining:** 0

## Implementation Tasks

### Task 1: Migration 010 — schema, seed, rename, flag

**Objective:** Create `practices` table seeded with 15 rows, rename `style[]` columns to `practices[]` / `practice_preference[]`, mark all 45 pros as `needs_practice_review = true`, set `practices = '{}'` for all rows. Single transaction for atomicity.
**Dependencies:** None
**Mapped Scenarios:** TS-001, TS-002, TS-003 (all depend on table + columns existing)

**Files:**
- Create: `migrations/010_holistic_practices_catalog.sql`
- Test: `__tests__/integration/practices-migration.test.ts`

**Key Decisions / Notes:**
- Wrap the entire migration in `BEGIN; ... COMMIT;` so a partial failure rolls back cleanly. The first non-comment line of the file is `BEGIN;`; the last non-comment line is `COMMIT;`.
- `practices` table: `key text primary key`, `label text not null`, `slug text unique not null`, `sort_order int not null default 0`, `active bool not null default true`, `created_at timestamptz not null default now()`.
- Seed using a single `INSERT INTO practices (key, label, slug, sort_order) VALUES ...` with all 15 rows from the PRD canonical list.
- **Operation order — must run in this exact sequence inside the transaction** (the SET NOT NULL has to come *after* the catch-all UPDATE so it can never fail on a residual NULL):
  1. `CREATE TABLE practices (...);`
  2. `INSERT INTO practices VALUES ...;` (15 seed rows)
  3. `ALTER TABLE professionals RENAME COLUMN style TO practices;`
  4. `ALTER TABLE leads RENAME COLUMN style_preference TO practice_preference;`
  5. `UPDATE professionals SET practices = '{}';` (clears every row — handles NULL and any legacy values atomically)
  6. `ALTER TABLE professionals ALTER COLUMN practices SET DEFAULT '{}';`
  7. `ALTER TABLE professionals ALTER COLUMN practices SET NOT NULL;` (safe now — step 5 guaranteed no NULLs)
  8. `ALTER TABLE professionals ADD COLUMN needs_practice_review boolean NOT NULL DEFAULT false;`
  9. `UPDATE professionals SET needs_practice_review = true;` (flags every existing row)
- Rollback section at the bottom (manual, comment-only): drop the new column, rename back, drop the table.

**Definition of Done:**
- [ ] Migration file's first non-comment line is `BEGIN;` and last non-comment line is `COMMIT;` (verified via `head -n 5` and `tail -n 5` of the file).
- [ ] Migration applies cleanly against a fresh DB and against a copy of prod schema.
- [ ] `SELECT COUNT(*) FROM practices WHERE active = true` returns 15.
- [ ] `SELECT key FROM practices ORDER BY sort_order` returns the canonical PRD order.
- [ ] `SELECT COUNT(*) FROM professionals WHERE needs_practice_review = false` returns 0.
- [ ] `SELECT COUNT(*) FROM professionals WHERE practices = '{}'` returns the total pro count.
- [ ] `\d professionals` shows `practices text[] not null default '{}'` and `needs_practice_review boolean not null default false`. `style` column is absent.
- [ ] `\d leads` shows `practice_preference text[]`. `style_preference` is absent.
- [ ] Integration test asserts: `INSERT INTO professionals (..., practices) VALUES (..., NULL)` raises a NOT NULL violation (confirms the constraint is actually enforced, not just declared in the file).
- [ ] Integration test passes.

**Verify:** `npm run test:integration -- --testPathPattern=practices-migration`

### Task 2: `lib/practices.ts` — Practice type, getActivePractices(), validatePracticeKeys()

**Objective:** Single TypeScript module exporting the `Practice` type, a server-side fetcher (`getActivePractices()`), and a key validator (`validatePracticeKeys()`). Used by all consumers.
**Dependencies:** Task 1
**Mapped Scenarios:** TS-001 (registro fetches), TS-002 (solicitar fetches), TS-005 (validation)

**Files:**
- Create: `lib/practices.ts`
- Test: `__tests__/integration/practices-helpers.test.ts`

**Key Decisions / Notes:**
- `Practice` type: `{ key: string; label: string; slug: string; sort_order: number; active: boolean }`.
- `getActivePractices()`: `async () => Promise<Practice[]>`. Uses `supabaseAdmin.from('practices').select('*').eq('active', true).order('sort_order', { ascending: true })`. Throws on error. Internally hits the same module-level cache used by `validatePracticeKeys` (see below) so callers within a process don't pay repeat Supabase round-trips.
- `validatePracticeKeys(keys: string[]): Promise<{ ok: true } | { ok: false; invalidKey: string }>`. Used by Tasks 5, 7, 8 (every write path). **Backed by a module-level cache** to avoid issuing one SELECT per write at registration peak — see Cache strategy below.
- **Cache strategy (module-level singleton with TTL):**
  ```ts
  let cache: { keys: Set<string>; fetchedAt: number } | null = null;
  const TTL_MS = 60_000; // 60 seconds
  async function getKeys(): Promise<Set<string>> {
    const now = Date.now();
    if (cache && now - cache.fetchedAt < TTL_MS) return cache.keys;
    const rows = await supabaseAdmin.from('practices').select('key').eq('active', true);
    if (rows.error) throw new Error(`Failed to fetch practice keys: ${rows.error.message}`);
    cache = { keys: new Set(rows.data.map(r => r.key)), fetchedAt: now };
    return cache.keys;
  }
  ```
  `getActivePractices` and `validatePracticeKeys` both go through this. Trade-off: up to 60s lag between admin SQL edit and validation accepting the new key. Acceptable because admin SQL edits already require manual deploy-restart for cache busting elsewhere.
- One-line JSDoc per export. No `console.log` — errors throw or return structured results.

**Definition of Done:**
- [ ] `getActivePractices()` returns 15 practices in `sort_order` order.
- [ ] `getActivePractices()` excludes `active = false` rows (verified by adding a deactivated test row).
- [ ] `validatePracticeKeys(['reiki', 'meditacion-mindfulness'])` returns `{ ok: true }`.
- [ ] `validatePracticeKeys(['reiki', 'definitely-fake'])` returns `{ ok: false, invalidKey: 'definitely-fake' }`.
- [ ] `validatePracticeKeys([])` returns `{ ok: true }` (empty is valid).
- [ ] Cache test: two consecutive calls to `validatePracticeKeys` issue exactly one Supabase query (verified by spying on the supabase client).
- [ ] Cache TTL test: after fast-forwarding mocked time past 60s, the next call re-issues the Supabase query.
- [ ] Integration tests pass.

**Verify:** `npm run test:integration -- --testPathPattern=practices-helpers`

### Task 3: `<PracticePicker>` shared component

**Objective:** Single client-side controlled component used by registro form, solicitar form, and admin re-classification banner. Renders practices as chips; supports optional "No tengo preferencia" with mutual-exclusion semantics.
**Dependencies:** Task 2 (uses `Practice` type)
**Mapped Scenarios:** TS-001, TS-002, TS-003

**Files:**
- Create: `app/components/PracticePicker.tsx`
- Test: `app/components/PracticePicker.test.tsx`

**Key Decisions / Notes:**
- `'use client'` at top.
- Props: `{ practices: Practice[]; selected: string[]; onChange: (next: string[]) => void; label: string; helperText?: string; includeNoPreference?: boolean }`.
- Controlled: never owns state. `selected` and `onChange` come from the parent form.
- Layout: `<label>{label}</label>` + optional helperText + chip row using existing chip class pattern from registro form (`px-3 py-1.5 text-xs font-medium rounded-full border transition-all`, `bg-brand text-white border-brand` selected vs `bg-surface-2 text-foreground border-outline hover:border-brand/50` unselected).
- When `includeNoPreference = true`: render an extra pill labeled "No tengo preferencia" at the start of the chip row. Selected when `selected.length === 0`. Click handler:
  - If "No preference" is clicked → call `onChange([])`.
  - If a practice chip is clicked while "No preference" is the active state → call `onChange([clickedKey])` (clears the no-preference state and starts the multi-select).
  - If a practice chip is clicked otherwise → toggle in/out of `selected`.
- A11y: `<button type="button">` for chips (avoids form submit), `aria-pressed` set per chip.
- No new design tokens.

**Definition of Done:**
- [ ] Renders one chip per practice.
- [ ] Selecting a chip calls `onChange([key])`; deselecting removes the key.
- [ ] With `includeNoPreference = true`: clicking the no-preference pill clears `selected`.
- [ ] With `includeNoPreference = true`: clicking a chip while selected is empty replaces with `[chipKey]`.
- [ ] Selected chips have `bg-brand` class; unselected have `bg-surface-2`.
- [ ] Component test passes.

**Verify:** `npm run test:unit -- --testPathPattern=PracticePicker`

### Task 4: Refactor `/profesionales/registro` into server-shell + RegistroForm

**Objective:** Convert the page to a server component that fetches practices and renders a new client form child. Move today's body verbatim into `RegistroForm.tsx` with the field rename `style[] → practices[]` and the picker swap to `<PracticePicker>`.
**Dependencies:** Task 2, Task 3
**Mapped Scenarios:** TS-001

**Files:**
- Modify: `app/profesionales/registro/page.tsx`
- Create: `app/profesionales/registro/RegistroForm.tsx`
- Test: existing `__tests__/e2e/registration-flow.spec.ts` updated in Task 12

**Key Decisions / Notes:**
- New `page.tsx` (server): `export default async function ProfessionalRegistrationPage() { const practices = await getActivePractices(); return <RegistroForm practices={practices} />; }`.
- `RegistroForm.tsx` (client): contains today's `'use client'` body verbatim. Changes:
  - `FormData.style: string[]` → `practices: string[]`. Same for `initialFormData`.
  - `toggleArrayField('style', ...)` → `toggleArrayField('practices', ...)` (or replace inline that path with `<PracticePicker>` `onChange`). Function signature: `(field: 'modality' | 'specialties' | 'practices' | 'service_type', value: string)`.
  - The inline `STYLES.map(s => ...)` block (lines 482-506 in current file) is deleted; replaced with `<PracticePicker practices={practices} selected={formData.practices} onChange={next => setFormData(prev => ({...prev, practices: next}))} label="Práctica" helperText="¿Qué tipo de práctica ofrecés? Podés elegir varias." />`.
  - Submit handler changes `payload.append('style', JSON.stringify(formData.style))` → `payload.append('practices', JSON.stringify(formData.practices))`.
  - The label "¿Qué enfoque terapéutico te identifica?" → handled by `<PracticePicker label="Práctica">`. Surrounding heading or helper text adapted similarly.
- Delete the local `STYLES` constant (lines 41-48 of today's file).
- All other form behavior (steps, validation, image upload, phone parsing) is unchanged.

**Definition of Done:**
- [ ] `page.tsx` is a server component (no `'use client'` directive).
- [ ] `page.tsx` imports `getActivePractices` and renders `<RegistroForm practices={...} />`.
- [ ] `RegistroForm.tsx` is `'use client'`, accepts `practices: Practice[]` prop, uses `<PracticePicker>`.
- [ ] No reference to `STYLES`, `style` field, or `'style'` key remains in either file.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.
- [ ] Manual smoke: `/profesionales/registro` loads, step 2 shows the practice picker with 15 chips.

**Verify:** `npm run lint && npm run build`

### Task 5: `/api/professionals/register` — accept `practices`, validate keys

**Objective:** Update the registration POST endpoint to read `practices` (renamed from `style`) from FormData/JSON, call `validatePracticeKeys()`, and insert into the `practices` column. Sequenced IMMEDIATELY AFTER Task 4 (registro form refactor) so the data flow stays unbroken — the form sends `practices` and the API consumes it in the same step.
**Dependencies:** Task 1, Task 2, Task 4 (the form must be sending `practices` for the API change to be testable end-to-end)
**Mapped Scenarios:** TS-001, TS-005

**Files:**
- Modify: `app/api/professionals/register/route.ts`
- Test: `app/api/professionals/register/route.test.ts` (new)

**Key Decisions / Notes:**
- `parseBody()` change: `style: parseJsonArray(formData.get('style'))` → `practices: parseJsonArray(formData.get('practices'))`.
- After existing validation block, insert: `const practices = (fields.practices as string[]) || []; if (practices.length > 0) { const result = await validatePracticeKeys(practices); if (!result.ok) return NextResponse.json({ error: \`Práctica inválida: \${result.invalidKey}\` }, { status: 400 }); }`.
- Insert payload: `style: (fields.style as string[]) || []` → `practices`. The DB column is now `practices` (post-Task 1).
- New row inserts always satisfy `needs_practice_review = false` (default). New pros land already-classified.
- Test cases: (a) valid practices → 201, row inserted; (b) unknown key → 400 with key in body; (c) empty practices array → 201 (allowed); (d) `style` field still in body → ignored (not destructive — keys not in column drop).

**Definition of Done:**
- [ ] `parseBody()` extracts `practices` instead of `style`.
- [ ] Unknown keys return 400; the offending key appears in the error message.
- [ ] Insert payload uses `practices` column.
- [ ] `style` references removed from the file.
- [ ] Integration test passes (4 cases).

**Verify:** `npm run test:integration -- --testPathPattern=professionals/register`

### Task 6: Refactor `/solicitar` into server-shell + SolicitarForm

**Objective:** Same server-shell + client-form-child pattern as Task 4, applied to the concierge form. Includes the "No tengo preferencia" mutual-exclusion behavior via `<PracticePicker includeNoPreference>`. Sequenced AFTER Task 5 (register API done) and BEFORE Task 7 (createLead update) — the form will send `practice_preference` and the server action that consumes it gets updated immediately after.
**Dependencies:** Task 2, Task 3
**Mapped Scenarios:** TS-002

**Files:**
- Modify: `app/solicitar/page.tsx`
- Create: `app/solicitar/SolicitarForm.tsx`

**Key Decisions / Notes:**
- New `page.tsx` (server): `export default async function SolicitarPage() { const practices = await getActivePractices(); return <SolicitarForm practices={practices} />; }`.
- `SolicitarForm.tsx` (client): today's body. Changes:
  - State `stylePreference: string[]` → `practicePreference: string[]`. `setStylePreference` → `setPracticePreference`.
  - The inline `STYLE_OPTIONS.map(...)` block (around lines 359-383) is deleted; replaced with `<PracticePicker practices={practices} selected={practicePreference} onChange={setPracticePreference} label="Práctica preferida" helperText="¿Hay alguna práctica que te resuene más? Si no, dejá 'No tengo preferencia'." includeNoPreference />`.
  - Submit handler changes `style_preference: stylePreference.length > 0 ? stylePreference : undefined` → `practice_preference: practicePreference.length > 0 ? practicePreference : undefined`.
  - The hand-rolled `toggleStyle()` function (currently lines 95-99) is removed; `<PracticePicker>` owns this behavior.
- Delete the local `STYLE_OPTIONS` constant (lines 43-51 of today's file).

**Definition of Done:**
- [ ] `page.tsx` is server component, fetches practices, renders `<SolicitarForm>`.
- [ ] `SolicitarForm.tsx` uses `<PracticePicker includeNoPreference>`.
- [ ] No reference to `STYLE_OPTIONS`, `stylePreference`, or `style_preference` remains.
- [ ] `createLead` is called with `practice_preference: ...` (renamed argument matches Task 7's renamed input).
- [ ] `npm run build` succeeds.
- [ ] Manual smoke: opening the "Avanzado" section shows the picker with the no-preference pill.

**Verify:** `npm run build`

### Task 7: `createLead` action — accept `practice_preference`, validate keys

**Objective:** Mirror Task 5 for the lead creation server action. Sequenced IMMEDIATELY AFTER Task 6 (solicitar refactor) so the data flow stays unbroken — the form sends `practice_preference` and the server action consumes it in the same step.
**Dependencies:** Task 1, Task 2
**Mapped Scenarios:** TS-002, TS-005

**Files:**
- Modify: `app/actions/create-lead.ts`
- Test: `__tests__/integration/create-lead.test.ts` (new)

**Key Decisions / Notes:**
- `CreateLeadInput.style_preference?: string[]` → `practice_preference?: string[]`.
- Before the insert, call `validatePracticeKeys(input.practice_preference || [])`. On failure, throw a typed error with a Spanish message (`Práctica inválida: <key>`).
- Insert: `style_preference: input.style_preference` → `practice_preference: input.practice_preference`. The DB column is `leads.practice_preference` (post-Task 1).
- Test cases: (a) valid practices → success, lead row exists; (b) unknown key → throws; (c) undefined → success, NULL stored.

**Definition of Done:**
- [ ] Input field renamed.
- [ ] Validation in place; throws on bad keys.
- [ ] Insert uses `practice_preference`.
- [ ] No reference to `style_preference` remains.
- [ ] Integration test passes (3 cases).

**Verify:** `npm run test:integration -- --testPathPattern=create-lead`

### Task 8: `/api/admin/professionals/[id]` — extended GET + practices-only PATCH

**Objective:** Extend GET to include the practices catalog in the response. Add a practices-only PATCH path (parallel to the existing specialty-only path) that validates keys, updates `professionals.practices`, and clears `needs_practice_review`.
**Dependencies:** Task 1, Task 2
**Mapped Scenarios:** TS-003, TS-005

**Files:**
- Modify: `app/api/admin/professionals/[id]/route.ts`
- Modify: `app/api/admin/professionals/[id]/route.test.ts` (extend existing)

**Key Decisions / Notes:**
- GET: change `return NextResponse.json({ professional: data })` to `const practices = await getActivePractices(); return NextResponse.json({ professional: data, practices })`.
- PATCH: add a new branch parallel to the specialty-only path. Trigger condition: `!action && body.practices !== undefined`.
  - Validate `practices` is `string[]`.
  - Call `validatePracticeKeys(practices)` — return 400 with key on failure.
  - Update: `supabaseAdmin.from('professionals').update({ practices, needs_practice_review: false, updated_at: new Date().toISOString() }).eq('id', id)`.
  - Return `{ success: true }`.
- **Empty-array enforcement:** the practices-only PATCH must reject `{ practices: [] }` with 400 (`{ error: 'Seleccioná al menos una práctica' }`). The admin UI disables the save button at empty, but the API must ALSO enforce this — anyone calling the endpoint directly (curl, future admin tool) would otherwise be able to clear practices while the flag is also being cleared, leaving a pro in a worse state than before re-classification.
- The existing approve/reject and specialty-only paths are unchanged.
- Test cases: (a) GET includes `practices: [15 rows]`; (b) PATCH `{ practices: ['reiki'] }` returns `{ success: true }` and DB row has `needs_practice_review = false`, `practices = {reiki}`; (c) PATCH `{ practices: ['fake-key'] }` returns 400 with `Práctica inválida: fake-key`, no DB change, flag still true; (d) PATCH `{ practices: [] }` returns 400 with the empty-selection message, no DB change; (e) existing approve/reject/specialty tests still pass.

**Definition of Done:**
- [ ] GET response shape `{ professional, practices }`.
- [ ] Practices-only PATCH path: valid input returns 200 and updates both fields atomically.
- [ ] Practices-only PATCH path: unknown key returns 400 with the offending key in the body.
- [ ] Practices-only PATCH path: empty array returns 400 with Spanish error message.
- [ ] Existing route tests still pass.
- [ ] Integration test passes (5 cases).

**Verify:** `npm run test:integration -- --testPathPattern=admin/professionals`

### Task 9: Admin review page — banner + display label rename

**Objective:** Render a re-classification banner when `needs_practice_review` is true; integrate `<PracticePicker>` and a save button that calls the extended PATCH. Drop `STYLE_MAP` import; build a label map from the fetched `practices` catalog.
**Dependencies:** Task 3, Task 8
**Mapped Scenarios:** TS-003, TS-004 (admin display)

**Files:**
- Modify: `app/admin/professionals/[id]/review/page.tsx`

**Key Decisions / Notes:**
- Update `Professional` interface: `style: string[] | null` → `practices: string[]`. Add `needs_practice_review: boolean`.
- Update fetch handler: read `{ professional, practices }` from response (Task 8). Store both in component state.
- Drop `STYLE_MAP` import; build a `practiceLabelMap = useMemo(() => Object.fromEntries(practices.map(p => [p.key, p.label])), [practices])`. Use it where today's `STYLE_MAP[s]` lookup runs (line 188).
- Replace section heading "Enfoque terapéutico" → "Prácticas" (around line 321).
- Render banner when `professional.needs_practice_review`:
  - Position: above the score card (top of the review surface).
  - Tailwind: `bg-warning-weak border border-warning text-warning-strong rounded-2xl p-5`.
  - Heading: "Re-clasificación pendiente"; body: "Esta profesional necesita re-clasificación al nuevo catálogo holístico. Seleccioná las prácticas que ofrece y guardá."
  - `<PracticePicker practices={practices} selected={editedPractices} onChange={setEditedPractices} label="Prácticas" />` (a new `editedPractices` state, initialized to `professional.practices`).
  - Button "Guardar prácticas" — on click, PATCH `/api/admin/professionals/[id]` with `{ practices: editedPractices }`. On success, refetch (resets banner since flag is now false).
  - Disable button while loading or when `editedPractices.length === 0` (require ≥1 selection — defaulted decision; admin has full catalog visible, saving 0 defeats re-classification).
- After save success, the banner unmounts naturally on next render because `needs_practice_review` is false.

**Definition of Done:**
- [ ] No `STYLE_MAP` import in this file.
- [ ] Banner renders only when flagged; disappears after save.
- [ ] Save calls PATCH, validates server-side, refetches on success.
- [ ] Practices section shows labels from the catalog.
- [ ] Save button disabled with empty selection.
- [ ] `npm run lint` passes.
- [ ] **Vitest component test for the banner** (extracted into `app/admin/professionals/[id]/review/components/PracticeReclassificationBanner.tsx` for testability — the rest of the page can keep its current shape): (a) renders when `needs_practice_review = true`; (b) does NOT render when false; (c) save button is disabled when `selected.length === 0`; (d) clicking save with valid selection calls the mocked PATCH and the banner unmounts on a success response; (e) on PATCH failure the banner stays mounted and shows the error.

**Verify:** `npm run test:unit -- --testPathPattern=PracticeReclassificationBanner`

### Task 10: Public profile — render practices from catalog

**Objective:** Update `/p/[slug]` to read `professional.practices` from the DB and render labels from the catalog. Drop `STYLE_MAP`.
**Dependencies:** Task 1, Task 2
**Mapped Scenarios:** TS-004

**Files:**
- Modify: `app/p/[slug]/page.tsx`

**Key Decisions / Notes:**
- Update Supabase select string: `select('...style...')` → `select('...practices...')` (line 47).
- Update typed shape: `style: string[]` → `practices: string[]`.
- Drop `STYLE_MAP` import.
- Add `const practices = await getActivePractices();` in the page body. Build `practiceLabelMap` similarly to Task 9.
- Update the line `const styleLabels = (professional.style || []).map(s => STYLE_MAP[s] || s)` → `const practiceLabels = professional.practices.map(p => practiceLabelMap[p] ?? p)`.
- Section heading where these render — preserve existing visual treatment but rename to "Prácticas".
- If `practiceLabels.length === 0`, hide the section entirely (matches today's behavior for empty `style`).

**Definition of Done:**
- [ ] No `STYLE_MAP` import.
- [ ] Page selects `practices` from DB.
- [ ] Labels render via fetched catalog.
- [ ] Empty practices → no section.
- [ ] `npm run build` succeeds.

**Verify:** `npm run build` + manual smoke on a re-classified pro.

### Task 11: Remove `STYLE_MAP` from `lib/design-constants.ts`

**Objective:** Final cleanup. Delete the now-unused `STYLE_MAP` export.
**Dependencies:** Task 9, Task 10 (last consumers)
**Mapped Scenarios:** Goal Verification truth #4

**Files:**
- Modify: `lib/design-constants.ts`

**Key Decisions / Notes:**
- Delete lines 124-134 (the `STYLE_MAP` block and its preceding comment).
- All other constants (`SPECIALTY_MAP`, `MODALITY_MAP`, `SERVICE_TYPE_MAP`, etc.) stay.
- Verify with `grep`: `grep -r 'STYLE_MAP' app lib` → no matches.

**Definition of Done:**
- [ ] `STYLE_MAP` not exported from `lib/design-constants.ts`.
- [ ] `grep -r STYLE_MAP app lib` returns no matches.
- [ ] `npm run build` succeeds.

**Verify:** `npm run build`

### Task 12: Update existing E2E specs for renamed field

**Objective:** Update Playwright specs that submit the registration form to use the new field name.
**Dependencies:** Task 4
**Mapped Scenarios:** TS-001 (this is its implementation)

**Files:**
- Modify: `__tests__/e2e/registration-flow.spec.ts`
- Modify: `__tests__/e2e/registration-full-flow.spec.ts`

**Key Decisions / Notes:**
- Find any selector or fixture that targets the old "Estilo terapéutico" label / `style` field name. Update to "Práctica" and the new chip text.
- Add a new test step that verifies a practice chip becomes selected after click.
- If existing tests submit a JSON body with `style: [...]`, change to `practices: [...]`.
- Update assertions on the post-submit DB row from `style` to `practices`.
- TS-001 (defined in this plan) becomes the formal test in this spec.

**Definition of Done:**
- [ ] Both specs pass against a freshly-built app (`npm run build && npm run test:e2e`).
- [ ] TS-001 steps are runnable end-to-end.
- [ ] Full Playwright suite (`npm run test:e2e`) is green.

**Verify:** `npm run test:e2e`

## Open Questions

(None — all design decisions resolved during plan-phase exploration.)

### Deferred Ideas

- **Public `/api/practices` route** — surfaces if the deferred submission-workflow PRD or external consumers (mobile app, partner integrations) need the catalog. Not needed for v1.
- **`revalidateTag('practices')` cache invalidation** — defer until admin CRUD UI lands; until then, manual deploy restart is the agreed flush.
- **`practices` table grows columns for the deferred submission workflow** — `status`, `submitted_by`, `merged_into`. Non-breaking additions; no work in this PRD.
- **Practice icons / descriptions in `<PracticePicker>`** — surfaces naturally in the deferred submission workflow PRD as part of the merge-duplicates UI.
