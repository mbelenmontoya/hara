# "Qué es Hara" Onboarding Modal Implementation Plan

Created: 2026-06-06
Author: belu.montoya@dialpad.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** A first-time visitor (any public page, once per browser) sees a welcome modal that explains what Hara is and how to use it, with a CTA to a new `/que-es-hara` page covering mission, vision, and how-we-work (Spanish, sourced from PRODUCT.md). The page is also reachable from the header nav.

## Out of Scope

- Re-showing the modal after a redesign in this iteration (the persistence key is versioned so a future bump can re-trigger it — see Autonomous Decisions — but no admin/reset UI is built now).
- Showing the modal on `/admin`, `/r/` recommendation links, or review pages (internal/concierge surfaces).
- Server-side / per-account "seen" tracking (Clerk auth is not yet configured — persistence is per-browser via `localStorage`).

## Approach

**Chosen:** Add a `WelcomeModal` client island mounted once in the root layout (`app/layout.tsx`), gated on a versioned `localStorage` flag, reusing the existing accessible `Modal` (`app/components/ui/Modal.tsx`). Add a static `/que-es-hara` page mirroring the `/ayuda` page scaffold, and add a nav link in `SiteHeader`.

**Why:** Reuses the existing focus-trapped `Modal` (with its `footer` CTA slot) and the established public-page scaffold (`PageBackground` + `GlassCard` + `container-public`) — no new UI primitives. The client-island + `localStorage`-on-mount pattern is the minimal correct way to show something "once per browser" without an SSR/hydration flash (server and first client render both produce `open=false` → nothing). Cost: one always-mounted client component, gated by an early return on excluded routes.

## Context for Implementer

- **The homepage `/` redirects server-side to `/profesionales`** (`app/page.tsx`), so a first-time visitor's first rendered page is `/profesionales`. The modal must therefore be global (mounted in the root layout), not page-specific.
- **The root layout is a Server Component** — it cannot use hooks or `localStorage`. The first-visit logic lives entirely inside the new `'use client'` `WelcomeModal`.
- **Route exclusions must mirror `SiteHeader`** (`app/components/SiteHeader.tsx:18-19`): prefixes `['/admin', '/r/', '/r/review']` and exact `['/']` (copy the array verbatim — `/r/review` is redundant with `/r/` for the `startsWith` check but is kept identical so the modal and header never drift). Use the same logic so the modal and header stay in sync.
- **Content voice:** Argentine informal Spanish (*vos, querés, escribís*). Per PRODUCT.md line 80 (visibility constraint), the page LEADS with the marketplace/directory; concierge (`/solicitar`) is mentioned briefly, not promoted as the headline.

## Autonomous Decisions

- **Persistence:** `localStorage` with a versioned key `hara:welcome-seen:v1`. `localStorage` (not `sessionStorage`) because the request is "just the first time you enter the site" = once per browser, forever. Versioned so a future redesign can bump to `:v2` to re-show.
- **Flag is set when the modal OPENS** (inside the mount effect), not on dismiss. This makes it literally "shown once per browser" regardless of how the user leaves (X, ESC, backdrop, CTA, or navigating away mid-view). Trade-off: a user who reloads the instant the modal appears won't see it again — acceptable for a welcome teaser whose full content lives on a permanent, nav-linked page.
- **`localStorage` access wrapped in try/catch.** If reading throws (private-mode/blocked storage), fail safe to NOT showing the modal — avoids re-prompting on every navigation when the flag can't be persisted.

## Runtime Environment

- **Start command:** `npm run dev` — Next.js dev server. Note: it may bind to an alternate port (3001/3002/3003) when 3000 is taken; check `lsof -i -P -n | grep LISTEN | grep node` for the actual port before E2E.
- **Health check:** `curl -s http://localhost:<port>/profesionales -o /dev/null -w "%{http_code}"` → expect `200`.

## E2E Test Scenarios

### TS-001: First-time visitor sees the welcome modal
**Priority:** Critical
**Preconditions:** `localStorage` cleared (or key `hara:welcome-seen:v1` absent). Fresh page load on `/profesionales`.
**Mapped Tasks:** Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In DevTools, run `localStorage.clear()`, then navigate to `/profesionales` | Page loads; welcome modal appears (role=dialog) with a Spanish title and body explaining what Hara is + how to use it |
| 2 | Read the modal footer | A primary "empezar a explorar" (dismiss) button and a "conocé más" link to the full page are visible |
| 3 | Evaluate `localStorage.getItem('hara:welcome-seen:v1')` | Returns `"1"` (flag set on open) |

### TS-002: Modal shows only once per browser
**Priority:** Critical
**Preconditions:** TS-001 has run (flag is set), OR flag manually set.
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Dismiss the modal (click "empezar a explorar") | Modal closes; `/profesionales` content is interactive (no backdrop) |
| 2 | Reload the page (`/profesionales`) | Welcome modal does NOT reappear |
| 3 | Navigate to `/ayuda` | Welcome modal does NOT appear |

### TS-003: Modal CTA opens the "Qué es Hara" page with mission/vision content
**Priority:** High
**Preconditions:** `localStorage` cleared; modal visible on `/profesionales`.
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click the "conocé más" CTA in the modal | Browser navigates to `/que-es-hara` |
| 2 | Read the page | Sections render in Spanish: what Hara is, how it works (directory-led), who it's for, what makes it different, the vision |
| 3 | Click the final CTA ("explorar profesionales") | Navigates to `/profesionales` |

### TS-004: "Qué es Hara" reachable from header nav
**Priority:** Medium
**Preconditions:** Flag set (no modal). Viewport ≥ 1024px (desktop nav).
**Mapped Tasks:** Task 1, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On `/profesionales`, locate the header nav | A "Qué es Hara" link is present alongside Profesionales / Pedí recomendación / Soy profesional / Ayuda |
| 2 | Click "Qué es Hara" | Navigates to `/que-es-hara`; the page renders |

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001   | Critical | PASS   | 0            | Modal appears on first visit, flag `hara:welcome-seen:v1="1"` set on open |
| TS-002   | Critical | PASS   | 0            | No modal on reload or /ayuda after flag set |
| TS-003   | High     | PASS   | 0            | "Conocé más" CTA → /que-es-hara, all 5 sections visible, final CTA → /profesionales |
| TS-004   | Medium   | PASS   | 0            | "Qué es Hara" nav link present on desktop, navigates to /que-es-hara |

## Progress Tracking

- [x] Task 1: Create the `/que-es-hara` informational page
- [x] Task 2: Build the `WelcomeModal` first-visit client component + mount it in the root layout
- [x] Task 3: Add the "Qué es Hara" nav link to `SiteHeader`

## Implementation Tasks

### Task 1: Create the `/que-es-hara` informational page

**Objective:** Create a static public page at `/que-es-hara` that explains Hara's mission, vision, and how it works, in Argentine-informal Spanish sourced from PRODUCT.md. It mirrors the existing `/ayuda` page scaffold and ends with a CTA back to the directory. This is the destination of the modal CTA (TS-003) and the nav link (TS-004).

**Files:**

- Create: `app/que-es-hara/page.tsx`

**Key Decisions / Notes:**

- Mirror `app/ayuda/page.tsx` exactly for structure: top-level `<div className="min-h-screen bg-background">`, `<PageBackground />`, `<div className="relative z-10 container-public pt-8 pb-12">`, a "← Volver al inicio" `Link` to `/`, an uppercase eyebrow label, an `<h1>`, intro paragraph, then `GlassCard` sections.
- Server Component (no `'use client'`) — content is static. Add `export const metadata = { title: 'Qué es Hara | Hara Vital', description: '...' }`.
- **Sections (Spanish, drawn from PRODUCT.md — write in voice, do NOT paste English):**
  1. **Qué es Hara** — from PRODUCT.md:7-11. A curated space for *terapias alternativas y bienestar holístico*; a *capa de confianza* between people atravesando algo (ansiedad, insomnio, duelo, estrés) and the practitioners who can accompany them. "El producto es la confianza."
  2. **Cómo funciona** — from PRODUCT.md:13-21. LEAD with **Explorá el directorio** (`/profesionales`) as the primary path; then briefly mention **Pedí una recomendación** (`/solicitar`) as the human-curated option. Both end in WhatsApp, on the user's terms.
  3. **Para quién es** — from PRODUCT.md:25-37. Personas buscando acompañamiento + profesionales del bienestar.
  4. **Qué nos hace diferentes** — from PRODUCT.md:60-66. Profesionales verificados · Reseñas de interacciones reales · Tu privacidad primero (*"tu info se comparte recién cuando vos escribís"*) · Hecho con cuidado (calmo, cálido, premium).
  5. **Nuestra visión** — from PRODUCT.md:39-41. Ser la capa de confianza del bienestar para todo el mundo que habla español; arrancamos en Argentina.
- End with a primary CTA (`Button` `variant="primary"` wrapped in a `Link` to `/profesionales`, or a styled `Link`) — label e.g. "Explorar profesionales".
- Use `text-foreground` / `text-muted` / `text-brand` tokens and `GlassCard`; no hardcoded colors (tailwind-tokens rule).
- No new logic, no branches → no unit test (a content-equals-content assertion would be coverage padding). Behavioral coverage is TS-003.

**Definition of Done:**

- [ ] Visiting `/que-es-hara` renders all five sections above in Spanish, plus the back-link and the final CTA to `/profesionales` (TS-003 steps 2–3).
- [ ] Page leads with the directory/marketplace; concierge is mentioned but not the headline (PRODUCT.md visibility constraint).
- [ ] Verify: `npm run lint` (0 errors in the new file) and the page builds — confirmed via TS-003/TS-004 in browser.

### Task 2: Build the `WelcomeModal` first-visit client component + mount it in the root layout

**Objective:** Create a `'use client'` `WelcomeModal` that, on mount, shows the existing `Modal` exactly once per browser using a versioned `localStorage` flag, excluded on admin/concierge/review routes. Mount it once in the root layout so it covers every public page. This delivers the working first-visit experience (TS-001, TS-002).

**Files:**

- Create: `app/components/WelcomeModal.tsx`
- Create: `app/components/WelcomeModal.test.tsx`
- Modify: `app/layout.tsx`

**Key Decisions / Notes:**

- Constants at top: `const SEEN_KEY = 'hara:welcome-seen:v1'`, `const EXCLUDED_PREFIXES = ['/admin', '/r/', '/r/review']`, `const EXCLUDED_EXACT = ['/']` — copy `SiteHeader.tsx:18-19` verbatim (all three prefixes) so the modal and header stay in sync.
- State: `const [open, setOpen] = useState(false)`. `useState(false)` is the SSR/first-render value → renders `null` on server (no hydration mismatch).
- `useEffect(() => { ... }, [])` on mount: if `pathname` is excluded → return. Else read the flag inside try/catch; if absent, `setOpen(true)` AND write the flag (`localStorage.setItem(SEEN_KEY, '1')`) in the same effect (flag set on open — see Autonomous Decisions). If `localStorage` access throws, do nothing (fail-safe: no modal).
- Use `usePathname()` from `next/navigation` for the exclusion check (works in a client component mounted in the layout).
- Render `<Modal open={open} onClose={() => setOpen(false)} title="...">` with: a short body (what Hara is + how to use it, Argentine-informal Spanish) and a `footer` containing two actions — a "conocé más" link/Button to `/que-es-hara` (use `next/link`) and a primary "empezar a explorar" `Button` that calls `setOpen(false)`. Both simply close/navigate; the flag was already set on open.
- Modal copy (concise, ≤3 short sentences): what Hara is + "Buscá por nombre, práctica o lo que estás atravesando, y escribí directamente — tu info se comparte recién cuando vos escribís."
- Mount in `app/layout.tsx`: `import { WelcomeModal } from '@/app/components/WelcomeModal'` and render `<WelcomeModal />` inside `<body>`, after `<SiteHeader />` (sibling to `{children}`).
- **Test (1 unit test class, jsdom provides `localStorage`):** (a) renders the modal when the flag is absent; (b) renders nothing when `localStorage` already has `hara:welcome-seen:v1`; (c) sets the flag after first render (open path); (d) does NOT render on an excluded route. Clear `localStorage` in `beforeEach`. Mock `next/navigation`'s `usePathname` — default `/profesionales`, plus an `/admin` case AND an `/r/abc123` case (the most common excluded entry point, a concierge recommendation link) to assert the modal does NOT show. Assert observable output (modal title present/absent + flag value), not internal calls.

**Definition of Done:**

- [ ] With no `hara:welcome-seen:v1` flag, `WelcomeModal` renders the dialog; with the flag present, it renders nothing (unit test (a)+(b)).
- [ ] After first mount on a non-excluded route, `localStorage.getItem('hara:welcome-seen:v1') === '1'` (unit test (c); TS-001 step 3).
- [ ] On a `/admin` pathname AND an `/r/abc123` pathname, the modal does not render (unit test (d)).
- [ ] Verify: `npx vitest run app/components/WelcomeModal.test.tsx`

### Task 3: Add the "Qué es Hara" nav link to `SiteHeader`

**Objective:** Add a "Qué es Hara" entry to the `SiteHeader` nav so the page is discoverable beyond the modal (TS-004), in both the desktop nav and the mobile dropdown (both map over the same `NAV_LINKS`).

**Files:**

- Modify: `app/components/SiteHeader.tsx`
- Modify: `app/components/SiteHeader.test.tsx`

**Key Decisions / Notes:**

- Add `{ href: '/que-es-hara', label: 'Qué es Hara' }` to the `NAV_LINKS` array (`SiteHeader.tsx:11-16`). Placement: append after `/ayuda` to keep the existing order stable. Both desktop and mobile navs render from this one array, so no other production change is needed; the active-link highlighting logic already handles any `href`.
- `SiteHeader.test.tsx` already asserts each nav link renders with its `href` (lines ~19-46). Add ONE assertion in the existing desktop-nav test for the new link — `expect(screen.getByRole('link', { name: 'Qué es Hara' })).toHaveAttribute('href', '/que-es-hara')`. This is a one-line addition to an existing test class (no new test class — parsimony), giving the new link explicit coverage rather than relying on a Trivial escape.

**Definition of Done:**

- [ ] The header nav (desktop ≥1024px and mobile dropdown) shows a "Qué es Hara" link pointing to `/que-es-hara` (TS-004 step 1), asserted by the new line in `SiteHeader.test.tsx`.
- [ ] Verify: `npx vitest run app/components/SiteHeader.test.tsx`
