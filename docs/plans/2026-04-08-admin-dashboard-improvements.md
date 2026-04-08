# Admin Dashboard Improvements Plan

Created: 2026-04-08
Author: belu.montoya@dialpad.com
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Improve all three admin list pages (Leads, Professionals, PQLs) with search, status filtering, richer data display, and inline match context on leads. Migrate debug API routes to proper admin endpoints.

**Architecture:** Client-side filtering pattern — each page fetches all records from a proper `/api/admin/*` endpoint on mount, then filters/searches/paginates entirely in the browser. A shared `AdminFilterBar` component provides the search + status dropdown UI across all three pages. Data volumes are small (<100 records per table), so client-side filtering is the right trade-off: simpler code, instant filtering, no API round-trips per keystroke.

**Tech Stack:** Next.js App Router (client components), Supabase (joins for match context), existing UI kit (GlassCard, Badge, Chip, Button)

## Scope

### In Scope

- Shared `AdminFilterBar` component (search input + status dropdown)
- New admin list API routes: `GET /api/admin/leads`, `GET /api/admin/professionals`, `GET /api/admin/pqls`
- Leads page rebuild: client component, filters, match context (tracking code + professional names inline), show urgency/WhatsApp/city
- Professionals page: add filter bar, use admin API, keep existing grouped layout
- PQLs page: add filter bar, show tracking code, fix data shape consistency
- Remove old debug routes (`/api/debug/professionals`, `/api/debug/pqls`)

### Out of Scope

- Dashboard overview / stats page (separate future spec)
- Pagination (not needed at current data volumes; can be added trivially later since filtering is already client-side)
- Loading skeletons (current "Cargando..." is fine for now)
- Changes to match creation page (`/admin/leads/[id]/match`) — except updating its API URL from debug to admin
- Changes to professional review page (`/admin/professionals/[id]/review`)
- Changes to login page
- PQL adjustment modal form fix (pre-existing bug: sends `amount` but API expects `adjustment_type` + `billing_month`)

## Approach

**Chosen:** Client-side filtering with shared filter component
**Why:** Simple implementation, instant UX, and the data volume (<100 rows per table) makes server-side filtering unnecessary overhead. All three pages become consistent client components with the same fetch → filter → render pattern.
**Alternatives considered:** (1) Server-side filtering via query params (rejected — over-engineered for current data volume, adds complexity to every API route). (2) Hybrid server pagination + client filtering (rejected — most complex, no benefit at this scale).

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:** The existing `ProfessionalsPage` (`app/admin/professionals/page.tsx:27-101`) is the closest pattern — client component, useEffect fetch, grouped rendering. The new pages follow this same pattern but add the filter bar.
- **Conventions:** All admin pages wrap content in `<AdminLayout>`. Cards use `<GlassCard>`. Status indicators use `<Badge>`. Specialty tags use `<Chip>`. Error logging via `logError` from `@/lib/monitoring`. Spanish copy throughout (Argentine informal).
- **Key files:**
  - `app/components/AdminLayout.tsx` — shell layout with nav tabs (Leads, Profesionales, PQLs)
  - `app/components/ui/Badge.tsx` — status badges with variants: new, matched, contacted, converted, closed, default
  - `app/components/ui/GlassCard.tsx` — glass-morphism card wrapper
  - `app/components/ui/Chip.tsx` — specialty tags with color coding
  - `lib/design-constants.ts` — STATUS_CONFIG, SPECIALTY_MAP, MODALITY_MAP shared maps
  - `lib/supabase-admin.ts` — service role client for all DB operations
  - `lib/monitoring.ts` — `logError()` for error logging
- **Gotchas:**
  - The leads table has no `name` field — use `email` as the primary identifier, falling back to `Solicitud {id.slice(0,8)}`
  - PQL entries are per (match, professional) pair — they're created by a DB trigger on `contact_click` events. The PQL table has `billing_month` (DATE), not a display-formatted string.
  - Badge component variants are: `new`, `matched`, `contacted`, `converted`, `closed`, `default`. Professional status values (`submitted`, `active`, `rejected`, `draft`, `paused`) map through `STATUS_CONFIG` in design-constants.
  - The existing `app/api/admin/professionals/[id]/route.ts` handles single-professional GET/PATCH — the new list route at `app/api/admin/professionals/route.ts` is a sibling, not a replacement.
  - Supabase join syntax for match context: `.select('*, matches(tracking_code, match_recommendations(rank, professionals(full_name, slug))))')` returns nested arrays.

## Runtime Environment

- **Start command:** `npm run dev` (port 3000)
- **Health check:** `http://localhost:3000/api/health`

## Assumptions

- Data volumes are <100 records per table — supported by current `.limit(50)` on leads and `.limit(100)` on PQLs suggesting small datasets. All tasks depend on this (client-side filtering wouldn't scale to 10k+).
- Supabase join syntax works for `leads → matches → match_recommendations → professionals` — supported by foreign key relationships in schema (`FINAL_SPEC.md:76-78`). Task 2 depends on this.
- The `GlassCard`, `Badge`, `Chip`, `Button` components are stable and don't need changes — supported by existing usage across all admin pages. Tasks 3-5 depend on this.
- The `debug` routes have no consumers other than the admin pages (professionals list and PQLs list). Task 2 depends on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Supabase nested join for leads+matches returns unexpected shape | Medium | Medium | Test the query shape in Task 2 and handle the nested array structure explicitly in the API transform |
| Removing debug routes breaks something | Low | Medium | Search codebase for all consumers before deletion; update all references in same PR |
| Filter bar adds visual clutter on small screens | Low | Low | Use responsive layout: search full width on mobile, status dropdown below |

## Goal Verification

### Truths

1. All three admin list pages have a search input and status dropdown that filter results instantly
2. The Leads page shows tracking code and matched professional names for leads with status !== 'new'
3. Searching by name/email on Professionals page returns matching results with no page reload
4. The `/api/debug/professionals` and `/api/debug/pqls` routes no longer exist — their functionality lives at `/api/admin/professionals` and `/api/admin/pqls`
5. TS-001 (Leads filtering), TS-002 (Professionals filtering), TS-003 (PQLs filtering) pass end-to-end

### Artifacts

- `app/admin/components/AdminFilterBar.tsx` — shared filter component
- `app/api/admin/leads/route.ts` — leads list API
- `app/api/admin/professionals/route.ts` — professionals list API
- `app/api/admin/pqls/route.ts` — PQLs list API
- `app/admin/leads/page.tsx` — rebuilt leads page
- `app/admin/professionals/page.tsx` — enhanced professionals page
- `app/admin/pqls/page.tsx` — enhanced PQLs page

## E2E Test Scenarios

### TS-001: Leads Page Filtering and Match Context
**Priority:** Critical
**Preconditions:** Dev server running, at least one lead exists in DB (ideally one matched, one new)
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/leads` | Page loads, leads list visible, filter bar with search input and status dropdown visible |
| 2 | Verify a matched lead shows tracking code and professional names | Tracking code badge visible, at least one professional name shown |
| 3 | Type a lead's email in the search box | List filters to show only matching leads |
| 4 | Clear search, select "new" from status dropdown | Only leads with "new" status visible |
| 5 | Select "Todos" from status dropdown | All leads visible again |

### TS-002: Professionals Page Filtering
**Priority:** High
**Preconditions:** Dev server running, at least one professional exists
**Mapped Tasks:** Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/professionals` | Page loads, professionals list visible, filter bar visible |
| 2 | Type a professional's name in search | List filters to matching professionals |
| 3 | Select "Activo" from status dropdown | Only active professionals shown |
| 4 | Clear all filters | Full list restored |

### TS-003: PQLs Page Filtering
**Priority:** High
**Preconditions:** Dev server running, at least one PQL entry exists
**Mapped Tasks:** Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/pqls` | Page loads, PQL table visible, filter bar visible |
| 2 | Type a professional's name in search | Table filters to matching entries |
| 3 | Screenshot "pqls-filtered" | Captured |

## Progress Tracking

- [x] Task 1: Create shared AdminFilterBar component
- [x] Task 2: Create admin list API routes and remove debug routes
- [x] Task 3: Rebuild Leads page with filters and match context
- [x] Task 4: Enhance Professionals page with filters
- [x] Task 5: Enhance PQLs page with filters and richer data
      **Total Tasks:** 5 | **Completed:** 5 | **Remaining:** 0

## Implementation Tasks

### Task 1: Create shared AdminFilterBar component

**Objective:** Build a reusable filter bar component that provides a search input and an optional status dropdown, used by all three admin list pages.

**Dependencies:** None

**Mapped Scenarios:** None (building block)

**Files:**

- Create: `app/admin/components/AdminFilterBar.tsx`

**Key Decisions / Notes:**

- The component accepts: `searchPlaceholder: string`, `searchValue: string`, `onSearchChange: (value: string) => void`, `statusOptions: { value: string; label: string }[]`, `statusValue: string`, `onStatusChange: (value: string) => void`, `resultCount: number`
- Status options always include "Todos" as the first option (value: `''` = no filter)
- Layout: search input (flex-1) + status dropdown side by side on desktop, stacked on mobile
- Use the glass card style consistent with the existing admin nav. Wrap in a div with `flex gap-3` layout, not a GlassCard (to avoid nesting cards).
- The search input should have a search icon (magnifying glass SVG inline) and clear button
- Include a result count text below the filters: "{count} resultados" (or "{count} resultado" for singular)
- Follow Input component styling: `bg-surface border border-outline rounded-xl focus:ring-2 focus:ring-brand/50 focus:border-brand`
- Use a native `<select>` element styled to match Input component. No custom dropdown needed for admin tooling. The existing `Select` component in `app/components/ui/Input.tsx` provides label/error/helper patterns — use that or replicate its styling inline.

**Definition of Done:**

- [ ] Component renders search input + status dropdown
- [ ] Search has clear button when text is present
- [ ] Status dropdown shows "Todos" as first option
- [ ] Result count displayed below filters
- [ ] No diagnostics errors
- [ ] Component is under 120 lines

**Verify:**

- Visual check after integration in Task 3

---

### Task 2: Create admin list API routes and remove debug routes

**Objective:** Create proper admin API endpoints for listing leads (with match joins), professionals, and PQLs. Remove the old `/api/debug/professionals` and `/api/debug/pqls` routes.

**Dependencies:** None

**Mapped Scenarios:** None (API layer)

**Files:**

- Create: `app/api/admin/leads/route.ts`
- Create: `app/api/admin/professionals/route.ts`
- Delete: `app/api/debug/professionals/route.ts`
- Modify: `app/api/debug/pqls/route.ts` → Delete (move to `app/api/admin/pqls/route.ts`)
- Modify: `app/admin/leads/[id]/match/page.tsx` (update fetch URL from `/api/debug/professionals` to `/api/admin/professionals`)
- Keep: `app/api/debug/route.ts` (it's a separate debug endpoint, not related)

**Key Decisions / Notes:**

- **Leads API** (`GET /api/admin/leads`): Query `leads` with Supabase join to get match context:
  ```
  .from('leads')
  .select(`
    id, email, whatsapp, country, city, intent_tags, status, urgency, created_at,
    matches (
      tracking_code,
      match_recommendations (
        rank,
        professionals:professional_id (full_name, slug)
      )
    )
  `)
  .order('created_at', { ascending: false })
  ```
  Transform response: flatten `matches[0]` (a lead has at most one match), extract professional names from recommendations sorted by rank.

- **Professionals API** (`GET /api/admin/professionals`): Same query as debug route but at proper path. Select: `id, slug, full_name, specialties, status, country, city, email, created_at`. Return as `{ professionals: [...] }` with `name` field mapped from `full_name`.

- **PQLs API** (`GET /api/admin/pqls`): Same query as debug route but at proper path. Fix the response shape — use `professional` (singular) consistently. Add `tracking_code` from the pqls table. Select:
  ```
  id, professional_id, billing_month, tracking_code, created_at,
  professionals (full_name, slug)
  ```
  Transform: `{ entries: [{ id, professional_id, month: billing_month, tracking_code, created_at, professional: { name, slug } }] }`

- All routes: use `supabaseAdmin`, `export const runtime = 'nodejs'`, error handling with `logError` (not console.error).
- Security: All admin routes are already gated by middleware (`middleware.ts:16-19`).
- **Match creation page consumer:** `app/admin/leads/[id]/match/page.tsx:50` also fetches from `/api/debug/professionals`. Update its fetch URL to `/api/admin/professionals` — one-line change, must not be missed.
- The middleware `/api/debug` protection remains for `app/api/debug/route.ts`. No middleware changes needed.

**Definition of Done:**

- [ ] `GET /api/admin/leads` returns leads with nested match context
- [ ] `GET /api/admin/professionals` returns professional list
- [ ] `GET /api/admin/pqls` returns PQL entries with professional info and tracking code
- [ ] `/api/debug/professionals` and `/api/debug/pqls` are deleted
- [ ] No other files reference the deleted debug routes (search codebase)
- [ ] Error handling uses `logError` not `console.error`
- [ ] No diagnostics errors

**Verify:**

- `curl http://localhost:3000/api/admin/leads` (with auth cookie)
- `curl http://localhost:3000/api/admin/professionals` (with auth cookie)
- `curl http://localhost:3000/api/admin/pqls` (with auth cookie)
- `grep -r "api/debug/professionals\|api/debug/pqls" app/` returns 0 results (no stale references)

---

### Task 3: Rebuild Leads page with filters and match context

**Objective:** Convert the leads page from a server component to a client component with AdminFilterBar (search by email + status filter) and inline match context showing tracking code and matched professional names.

**Dependencies:** Task 1, Task 2

**Mapped Scenarios:** TS-001

**Files:**

- Modify: `app/admin/leads/page.tsx` (full rewrite — currently 87 lines server component → ~200 lines client component)

**Key Decisions / Notes:**

- Convert from server component to `'use client'` with useEffect data fetching pattern (same as professionals page).
- Fetch from `GET /api/admin/leads` (created in Task 2).
- **Search:** Filter by `email` (case-insensitive includes) and `intent_tags` content.
- **Status filter:** Options from lead status enum: `new`, `matched`, `contacted`, `converted`, `closed`.
- **Lead card layout:** Each lead is a GlassCard with:
  - Top row: email/id + Badge(status) + date
  - Second row: country · city · urgency badge (if set) · primary intent tag
  - If matched: third row showing tracking code (monospace) + matched professional names (comma-separated, linked to review)
- **Match context display:** For leads with `matches` data: show tracking code as a small monospace badge, and list the 3 professional names sorted by rank. The "Crear match" button only shows for `status === 'new'` leads (same as current).
- Use `logError` for error handling, Badge for status, EmptyState for empty list.

**Definition of Done:**

- [ ] Page loads and displays all leads with their data
- [ ] Search filters leads by email and intent tags
- [ ] Status dropdown filters by lead status
- [ ] Matched leads show tracking code and professional names inline
- [ ] "Crear match" button appears only for new leads
- [ ] Empty state shows when no results match filters
- [ ] No diagnostics errors
- [ ] File under 440 lines

**Verify:**

- Navigate to `/admin/leads`, verify leads load with match context visible
- Type in search, verify filtering works
- Select a status, verify filtering works
- TS-001 scenario passes

---

### Task 4: Enhance Professionals page with filters

**Objective:** Add AdminFilterBar to the professionals page with search by name and status filter. Switch to the new admin API route.

**Dependencies:** Task 1, Task 2

**Mapped Scenarios:** TS-002

**Files:**

- Modify: `app/admin/professionals/page.tsx`

**Key Decisions / Notes:**

- **API change:** Switch fetch from `/api/debug/professionals` to `/api/admin/professionals`.
- **Search:** Filter by `name` (case-insensitive includes). Also match against specialties for convenience.
- **Status filter:** Options from professional status enum via STATUS_CONFIG: `submitted` (Pendiente), `active` (Activo), `rejected` (Rechazado), `draft` (Borrador), `paused` (Pausado).
- **Keep existing grouped layout** — "Pendientes de revisión" and "Revisados" sections — but apply filters before grouping. When a status filter is active, grouping still applies (e.g., filtering by "active" shows all under "Revisados").
- Add the email and created_at to the card data (available from new API). Show registration date below location.
- Keep existing `ProfessionalRow` component.

**Definition of Done:**

- [ ] Filter bar visible with search + status dropdown
- [ ] Search filters by name and specialties
- [ ] Status filter works correctly
- [ ] Grouped layout preserved (submitted vs others)
- [ ] Fetch uses `/api/admin/professionals` (not debug route)
- [ ] No diagnostics errors
- [ ] File under 440 lines

**Verify:**

- Navigate to `/admin/professionals`, verify filter bar appears
- Search by name, verify results filter
- Filter by status, verify grouping still works
- TS-002 scenario passes

---

### Task 5: Enhance PQLs page with filters and richer data

**Objective:** Add AdminFilterBar to the PQLs page with search by professional name and month filter. Switch to admin API route. Show tracking code and improve data display.

**Dependencies:** Task 1, Task 2

**Mapped Scenarios:** TS-003

**Files:**

- Modify: `app/admin/pqls/page.tsx`

**Key Decisions / Notes:**

- **API change:** Switch fetch from `/api/debug/pqls` to `/api/admin/pqls`. Update the `PQLEntry` interface to match new response shape (singular `professional` field with `{ name, slug }`, plus `tracking_code`).
- **Search:** Filter by professional name (case-insensitive includes).
- **Status filter repurposed as month filter:** Instead of a status dropdown, use a month dropdown populated from the distinct `billing_month` values in the data. Options: "Todos los meses" + each unique month formatted as "Marzo 2026" etc.
- **Table columns:** Professional name | Tracking code (monospace) | Mes | Fecha | Acciones. The existing balance column should be removed — PQLs don't have a `balance` field (the current UI shows it but the API maps to something else). Show `created_at` formatted as date instead.
- **Pre-existing bug (PQL field name mismatch):** The current `PQLEntry` interface uses `professionals` (plural) but the debug API returns `professional` (singular) — this is an existing bug causing the page to show blank names. The new API and updated interface will resolve it by consistently using `professional` (singular).
- **Adjustment modal — out of scope:** The adjustment modal currently sends `{ amount, reason }` but the API expects `{ adjustment_type, reason, billing_month }`. This is a pre-existing bug unrelated to filtering improvements. It's explicitly out of scope for this plan — the modal HTML stays as-is. A separate fix should address the modal form fields.

**Definition of Done:**

- [ ] Filter bar visible with search + month dropdown
- [ ] Search filters PQL entries by professional name
- [ ] Month dropdown filters by billing month
- [ ] Table shows tracking code column
- [ ] Fetch uses `/api/admin/pqls` (not debug route)
- [ ] Data shape matches new API response
- [ ] Existing adjustment modal still works
- [ ] No diagnostics errors
- [ ] File under 440 lines

**Verify:**

- Navigate to `/admin/pqls`, verify filter bar and table render
- Search by professional name, verify filtering
- Select a month, verify filtering
- Click "Ajustar", verify modal still opens and works
- TS-003 scenario passes

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | NOT_VERIFIED | 0 | Admin login credentials unavailable in test session; static verification complete |
| TS-002 | High | NOT_VERIFIED | 0 | Same — auth-gated routes require manual browser E2E with valid admin session |
| TS-003 | High | NOT_VERIFIED | 0 | Same |

**Code-verified:** All three new API routes respond (307 auth redirect confirmed). Old debug routes deleted from filesystem. TypeScript clean. Build passes. 35 unit tests pass.

## Open Questions

None — all decisions resolved.
