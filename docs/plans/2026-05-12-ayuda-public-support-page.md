# /ayuda Public Support Page Implementation Plan

Created: 2026-05-12
Author: belu.montoya@dialpad.com
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Ship `/ayuda`, a public support page for Hara Vital leads, as Soft Launch Push Item 8. The page provides a self-serve answer to common questions and a clear contact path (email + Instagram DM). Its highest-value use case is link recovery for lost `/r/[tracking_code]` URLs — admin handles recovery manually; `/ayuda` is the route the user actually finds.

**Architecture:** Static Next.js App Router page that exactly mirrors the design of `app/components/TermsAndPrivacyPage.tsx` (PageBackground + container + back link + eyebrow label + anchor pill nav + `<GlassCard>` sections with accordion entries inside). To keep the codebase DRY, the existing `DisclosureItem` + `Chevron` components (currently private inside `TermsAndPrivacyPage.tsx`) are extracted to a shared module `app/components/ui/Disclosure.tsx` with generic type names; `TermsAndPrivacyPage` is updated to import from the new module, and `/ayuda` imports the same primitives.

**Tech Stack:** Next.js 14.2 App Router, TypeScript, Tailwind CSS v4 with design tokens from `app/globals.css`. No new dependencies. No database changes. Spanish (Argentine informal) copy throughout.

## Scope

### In Scope

- Extract `DisclosureItem` + `Chevron` components and their type shapes (`LegalDisclosure` → `DisclosureEntry`, `LegalGroup` → `DisclosureGroup`) from `app/components/TermsAndPrivacyPage.tsx` into a new `app/components/ui/Disclosure.tsx`. Update `TermsAndPrivacyPage` to import from there.
- New route at `app/ayuda/page.tsx` with the exact visual structure of `TermsAndPrivacyPage`: PageBackground + max-w-md/960px container + `← Volver al inicio` back link + uppercase "Ayuda" eyebrow + H1 title + intro paragraph + anchor pill nav linking to `#usuarios` and `#profesionales` + two `<GlassCard>` sections (Para usuarios, Para profesionales) with `<DisclosureItem>` accordion entries inside + a third `<GlassCard>` at the bottom as the contact card (email + Instagram).
- 6 user-facing FAQ entries + 6 professional-facing FAQ entries (drafted from the PRD; copy finalised during implementation TDD with Bel reviewing).
- Contact card: `mailto:centrovitalhara@gmail.com` link, `https://instagram.com/haravital` link. No WhatsApp.
- Modify `app/components/PublicLayout.tsx` footer to include an `Ayuda` link alongside the existing copyright line.
- Modify `app/error.tsx` to add a `¿Necesitás ayuda?` link below the existing "Volver al inicio" button.
- Modify the error state in `app/r/[tracking_code]/page.tsx` (lines 60-80) — replace `"Pedí uno nuevo por email."` with `"¿Perdiste tu link? Visitá /ayuda"`, link the `/ayuda` text.
- Modify `app/page.tsx` (Próximamente homepage) to add a small `¿Necesitás ayuda?` link near the privacy line at the bottom.
- Create `app/not-found.tsx` (does not exist today) mirroring the shell of `error.tsx` — same `min-h-screen bg-background flex items-center justify-center p-4` + ad-hoc card pattern, with `"Página no encontrada"` heading, a "Volver al inicio" button, and a `¿Necesitás ayuda?` link to `/ayuda`.

### Out of Scope

- **No contact form / form handling / rate-limiting / spam protection.** v1 surfaces only `mailto:` and IG-DM links; users compose messages in their own clients.
- **No self-serve link recovery.** Admin handles re-issuance manually via the email/IG response.
- **No response-time promise.** Don't write "respondemos en X hs" — avoid the SLA we may not meet.
- **No "Cómo funciona Hara" explainer.** That belongs on the home; duplicating invites drift.
- **No search / KB / multi-page help center.**
- **No new visual patterns.** Match `TermsAndPrivacyPage` exactly; reuse `<GlassCard>`, `<PageBackground>`, and the extracted Disclosure primitives.
- **No refactor of `app/error.tsx` to use `<GlassCard>`.** Pre-existing ad-hoc card pattern in `error.tsx:23-30` and `r/[tracking_code]/page.tsx:64` stays as-is — the lineage test for this PR is *add help links*, not *unify card styles*. That's a separate cleanup pass.
- **No mention of "concierge" or "/solicitar" by name in copy.** Link recovery copy is phrased passively: `"Si recibiste un link de recomendaciones y lo perdiste..."` — enforced by the concierge-visibility constraint in `PRODUCT.md` "How we make money" §2.
- **No new pro-facing flows.** "¿Cómo edito mi perfil?" FAQ entry directs to email; does NOT introduce edit infra (that's Phase 3 `/pro/*`).
- **No page-level unit/integration tests.** Matches the existing pattern — there are no tests for `/terminosyprivacidad`, `/privacidad`, `/terminos`. Static-content pages rely on E2E smoke (covered in `## E2E Test Scenarios` below).

## Approach

**Chosen:** Approach A — extract `DisclosureItem` + `Chevron` (+ their type shapes) to a shared module, then build `/ayuda` and other touch-points using the extracted primitives.

**Why:** Bel's directive is "match design exactly, reuse components." Two pages will use the accordion (`/terminosyprivacidad` and `/ayuda`); future pages may follow (e.g., a /faq or /soporte if scope evolves). Extracting once is the right cost-benefit — slightly larger PR but durable, prevents drift, and the rename to generic names (`DisclosureEntry`, `DisclosureGroup`) removes a misleading "Legal*" naming inherited from when the components were single-use.

**Alternatives considered:**

- **B. Duplicate inline in `/ayuda`** — rejected. Two copies of identical components is a future-drift risk; the marginal PR-size saving doesn't justify the maintenance cost.
- **C. Make `TermsAndPrivacyPage` itself reusable** — rejected. The page-level shells diverge meaningfully (legal has "Última actualización" line, ayuda has contact card; nav anchors differ). Forcing one component to handle both adds conditional props for no real reuse benefit at n=2.

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - Page shell: copy structure from `app/components/TermsAndPrivacyPage.tsx:88-160` — `PageBackground` first, then `max-w-md md:max-w-[960px]` container with padding, then back link, header block, nav row, sections, no `PublicLayout` wrapper.
  - GlassCard wrapping: see `TermsAndPrivacyPage.tsx:140-154` — every section is a `<GlassCard>` with `<h2>` + intro + `space-y-2` stack of `<DisclosureItem>` children.
  - Accordion item interaction: see `TermsAndPrivacyPage.tsx:43-86` — `useState` for `open`, `aria-expanded={open}`, chevron `rotate-90` on open, content reveals with `space-y-3` paragraphs and optional bullet list.
  - Spanish copy tone: see `lib/email.ts` pro-approval template (gender-neutral "Te damos la bienvenida"), `app/page.tsx:21-24` ("Estamos creando un espacio donde encontrar profesionales del bienestar sea simple, humano y confiable"). Argentine informal — vos, escribinos, querés.

- **Conventions:**
  - Components ≤ 440 lines, functions ≤ 50 lines (see `.claude/rules/component-standards.md`).
  - Design tokens only — `text-foreground`, `text-muted`, `text-brand`, `bg-background`, `bg-surface`, `border-outline`. Never hardcode hex values. See `.claude/rules/tailwind-tokens.md`.
  - No `console.log` in production code; use `lib/monitoring.ts` `logError` for errors. `console.error` in catch blocks is acceptable.
  - File header comment optional but, if present, follow the convention seen across the codebase: `// Brief description of what this component does\n// One line explaining its role in the feature`.
  - Spanish copy in all user-facing strings (see `.claude/rules/component-standards.md` Spanish Copy section).

- **Key files:**
  - `app/components/TermsAndPrivacyPage.tsx` — the design template AND the file that gets refactored to import from the new Disclosure module.
  - `app/terminosyprivacidad/page.tsx` — the consumer of `TermsAndPrivacyPage`; verify it still renders identically after the refactor.
  - `app/components/ui/GlassCard.tsx` — wrapper used inside sections. Takes `children` + optional `className`; renders `liquid-glass rounded-3xl shadow-elevated border border-outline/30 overflow-hidden` outer + `p-6` inner.
  - `app/components/ui/PageBackground.tsx` — fixed full-screen background with default illustration. `/ayuda` uses the default (no `image` prop).
  - `app/components/PublicLayout.tsx` — only the footer needs the `/ayuda` link; do NOT wrap `/ayuda` in `PublicLayout` (the static-info pages don't).
  - `app/error.tsx` — uses an ad-hoc card pattern, not GlassCard. Don't refactor; just add a "¿Necesitás ayuda?" link near the existing "Volver al inicio" button.
  - `app/r/[tracking_code]/page.tsx:60-80` — error state. Replace the existing "Pedí uno nuevo por email." line.
  - `app/page.tsx` — Próximamente homepage. Already minimal; add the `¿Necesitás ayuda?` link below the privacy line at the bottom (line 37-39).

- **Gotchas:**
  - `TermsAndPrivacyPage.tsx` is a `'use client'` file because `DisclosureItem` uses `useState`. When extracted to `app/components/ui/Disclosure.tsx`, the new module must keep `'use client'` at the top. `/ayuda/page.tsx` does NOT need `'use client'` itself — only the imported `<DisclosureItem>` is a client component; the rest of the page can be a server component.
  - The PRD's draft FAQ #5 for users says `"Los profesionales pagan por aparecer destacados"`. Be careful: that hints at Destacado pricing which is currently unannounced. Final wording must match PRODUCT.md tone: `"Los profesionales pueden pagar por aparecer destacados; los usuarios no pagan nada."` (verifies with Bel during implementation).
  - The PRD's draft pro FAQ #2 says `"3-5 días hábiles"` — verify this is the right expectation before shipping. If unsure, use vaguer language: `"Las revisamos lo más rápido que podemos."`
  - Instagram handle `@haravital` may not be registered yet. If not, drop the IG line at the bottom of `/ayuda` and ship email-only. Verify before merging.
  - `/r/[tracking_code]` error state currently differentiates `error === 'expired'` vs other errors. Both paths should funnel to `/ayuda` — the new wording `"¿Perdiste tu link? Visitá /ayuda"` is appropriate for both, but the "Reintentar" button only makes sense for non-expired errors. Keep the button, just adjust the helper line.
  - `app/not-found.tsx` is intentionally placed at `app/not-found.tsx` (Next.js App Router convention for the global 404), not inside any subdirectory.

- **Domain context:**
  - Hara Vital is a curated marketplace for holistic-wellness practitioners in Spanish-speaking markets. Two paths in (Browse via `/profesionales`, Concierge via `/solicitar`); both end in WhatsApp contact with a practitioner. Concierge attribution/billing is unsolved (see `PRODUCT.md` §"How we make money" 2) so concierge stays operationally alive but not promoted by name in copy.
  - WhatsApp is reserved for user ↔ practitioner contact — Hara's "info-sharing moment" promise. Hara's support channels are email + Instagram DM. Never list WhatsApp as a support channel.

## Runtime Environment

Next.js 14.2 dev server. Start: `npm run dev` (localhost:3000). Health check: visit any route, expect 200 + content. Restart: `Ctrl+C` then `npm run dev`. No deploy as part of this plan (Vercel auto-deploys on push to `main`).

## Assumptions

- **Tailwind v4 `@theme` tokens defined in `app/globals.css`** cover all the typography/color values needed (`text-foreground`, `text-muted`, `text-brand`, etc.). Supported by reading `globals.css:41-64` and the consistent usage across `TermsAndPrivacyPage.tsx`. Tasks 1, 2, 3, 4 all depend on this.
- **`'use client'` is required at the top of `app/components/ui/Disclosure.tsx`** because `DisclosureItem` uses `useState`. Supported by `TermsAndPrivacyPage.tsx:1`. Task 1 depends on this.
- **`/ayuda` can be a server component** because no client-side state lives at the page level — accordion state is inside the imported `<DisclosureItem>` client component, which is allowed inside a server component. Supported by Next.js App Router docs and the `/terminosyprivacidad/page.tsx` pattern (server page importing a `'use client'` component). Task 2 depends on this.
- **`@haravital` Instagram handle is registered** (or will be before merge). If unverified, IG line drops; supported by the visibility constraint allowing flexibility. Task 2 depends on this.
- **`/r/[tracking_code]` error state's "Reintentar" button stays useful** for non-expired errors (transient network failures, etc.). Supported by reading lines 60-80 — the reload may resolve transient issues. Task 3 depends on this.
- **No test infra exists for static-info pages** in this codebase (no `/terminosyprivacidad` tests found). Matches the established pattern. Tasks 1, 2, 3, 4 all assume page-level unit tests are out of scope; E2E scenarios cover smoke verification.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Disclosure-extraction breaks `TermsAndPrivacyPage` rendering | Low | High | After Task 1, manually verify `/terminosyprivacidad` renders identically (back link, anchor pills, terms + privacy sections, accordions expand/collapse, chevron rotates). E2E scenario TS-001 also verifies. |
| `@haravital` Instagram handle is not registered | Medium | Low | Verify before merge; if unverified, drop IG line + ship email-only. PRD's Open Questions already flag this. |
| FAQ content drift between PRD draft and Bel's actual preferred copy | Medium | Low | Implementation phase asks Bel to review draft FAQ inline during the TDD cycle; iterate before shipping. |
| Adding a `/ayuda` link to the Próximamente homepage subtly promotes "we're open" before launch | Low | Medium | Keep the link visually tiny + bottom-positioned, phrased neutrally (`¿Necesitás ayuda?`). Does NOT say "go browse professionals". |
| `app/not-found.tsx` shape diverges from `error.tsx`, creating visual inconsistency | Low | Low | Copy the exact shell from `error.tsx` lines 22-72; the only differences are heading text + omitting the "Intentar de nuevo" reset button (404 has nothing to reset). |
| Replacing "Pedí uno nuevo por email" on `/r/[tracking_code]` loses information for users who already know to email | Very Low | Very Low | The new wording `"¿Perdiste tu link? Visitá /ayuda"` leads to /ayuda which contains the email recovery FAQ. Net info content is preserved with one indirection. |

## Goal Verification

### Truths

1. **`/ayuda` exists at the route and renders** with PageBackground, container, back link, eyebrow label, H1, intro, anchor pill nav, two GlassCard sections (Para usuarios, Para profesionales) each with accordion FAQ entries, and a third GlassCard contact card at the bottom showing email + Instagram links.
2. **`/ayuda` visual design matches `/terminosyprivacidad` exactly** — same PageBackground, same container width, same back link styling, same eyebrow/H1/intro typography, same anchor pill nav styling, same GlassCard wrapping, same accordion `DisclosureItem` interaction (chevron rotation, expand animation, text styles).
3. **The `Disclosure` primitive is extracted to a shared module** (`app/components/ui/Disclosure.tsx`), exports `DisclosureItem`, `Chevron`, `DisclosureEntry`, `DisclosureGroup` (renamed from `LegalDisclosure`/`LegalGroup`), and `TermsAndPrivacyPage.tsx` imports them — no inline duplicates of `DisclosureItem` or `Chevron` remain in `TermsAndPrivacyPage.tsx`.
4. **`/terminosyprivacidad` continues to render and function identically** after the extraction — back link, anchor pills, terms + privacy sections, accordions expand/collapse, no visual regression.
5. **All four discoverability surfaces link to `/ayuda`** — public footer in `PublicLayout`, `app/error.tsx` (in the error card), `app/r/[tracking_code]/page.tsx` error state (replacing the existing email line), and `app/page.tsx` (Próximamente). All `<Link>` references use `next/link` and point to `/ayuda`.
6. **`app/not-found.tsx` exists** and visits to a nonexistent URL render a "Página no encontrada" card with a "Volver al inicio" button + "¿Necesitás ayuda?" link to `/ayuda`.
7. **All four E2E scenarios (TS-001 through TS-004) pass** end-to-end via browser automation.
8. **No copy on `/ayuda` mentions "concierge" or "/solicitar" by name** — verified by grep on the rendered text. The link-recovery FAQ uses passive phrasing `"Si recibiste un link de recomendaciones y lo perdiste..."`.

### Artifacts

- `app/components/ui/Disclosure.tsx` (new) — exports the accordion primitives.
- `app/components/TermsAndPrivacyPage.tsx` (modified) — imports from the new Disclosure module.
- `app/ayuda/page.tsx` (new) — the page itself.
- `app/components/PublicLayout.tsx` (modified) — footer adds `/ayuda` link.
- `app/error.tsx` (modified) — error card adds `/ayuda` link.
- `app/r/[tracking_code]/page.tsx` (modified) — error state line replaced.
- `app/page.tsx` (modified) — Próximamente adds `/ayuda` link.
- `app/not-found.tsx` (new) — 404 page.

## E2E Test Scenarios

These describe how the verifier confirms the feature works end-to-end via browser automation (`mcp__claude-in-chrome__*` or `playwright-cli`). They are not Vitest tests — no test files are created.

### TS-001: `/terminosyprivacidad` still works after Disclosure extraction (no regression)
**Priority:** Critical
**Preconditions:** Dev server running on localhost:3000
**Mapped Tasks:** Task 1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:3000/terminosyprivacidad` | Page loads, 200, full content visible |
| 2 | Snapshot the page | Same visual as before extraction: back link, eyebrow "Legal", H1 "Términos y privacidad", intro, "Última actualización" line, "Términos" / "Privacidad" pill nav, two GlassCard sections |
| 3 | Click the first accordion entry inside the Términos section | Chevron rotates 90deg, content expands below with paragraphs (and bullets if any) |
| 4 | Click the same entry again | Chevron rotates back, content collapses |
| 5 | Click the `Términos` and then the `Privacidad` pill nav links | Page scrolls to each anchor section smoothly |

### TS-002: `/ayuda` renders and accordion entries expand
**Priority:** Critical
**Preconditions:** Dev server running on localhost:3000
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:3000/ayuda` | 200, full page renders |
| 2 | Snapshot the page | PageBackground visible; back link "← Volver al inicio" at top; eyebrow "Ayuda" uppercase; H1 (e.g. "¿En qué te podemos ayudar?"); intro paragraph; anchor pill nav with "Para usuarios" + "Para profesionales"; two GlassCard sections; a third GlassCard at the bottom for contact |
| 3 | Click a FAQ entry in the "Para usuarios" section (e.g., "Si recibiste un link de recomendaciones...") | Chevron rotates, answer text expands below the question with mention of `centrovitalhara@gmail.com` and `@haravital` |
| 4 | Click the `Para profesionales` pill nav link | Page scrolls to the professionals section |
| 5 | Click the email link in the contact card | Browser attempts to open mailto:centrovitalhara@gmail.com (verify the link's `href` attribute via DOM inspection) |
| 6 | Click the Instagram link in the contact card | Link opens `https://instagram.com/haravital` (verify `href`) |
| 7 | Inspect the rendered DOM for the strings "concierge" or "/solicitar" | Neither string appears in `/ayuda` body text |

### TS-003: Lost-link recovery user flow
**Priority:** Critical
**Preconditions:** Dev server running. Before running this scenario, verify that visiting `/r/INVALID123` shows the error card (not an infinite loading skeleton). If the hook silently returns empty rather than setting `error`, identify a tracking code pattern that reliably triggers the error branch by reading `app/r/[tracking_code]/hooks/useRecommendations.ts`. Alternative trigger: a code with valid format but no DB match (API should return 404 → error branch).
**Mapped Tasks:** Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:3000/r/INVALID123` | Error state card renders: heading "No pudimos cargar" + the new helper line "¿Perdiste tu link? Visitá /ayuda" (with /ayuda as a link) |
| 2 | Click the `/ayuda` link | Navigates to `/ayuda` |
| 3 | Scroll to the FAQ entry "Si recibiste un link de recomendaciones y lo perdiste, ¿cómo lo recupero?" | Entry visible inside the Para usuarios GlassCard |
| 4 | Expand the entry | Answer reveals: `centrovitalhara@gmail.com` and `@haravital` references |

### TS-004: Discoverability — footer, 404, and Próximamente entry points
**Priority:** High
**Preconditions:** Dev server running
**Mapped Tasks:** Task 3, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:3000/` (Próximamente home) | Page renders with WaitlistForm; near the bottom, a small "¿Necesitás ayuda?" link is visible |
| 2 | Click that link | Navigates to `/ayuda` |
| 3 | Navigate to `http://localhost:3000/profesionales` | Public footer (`PublicLayout`) at the bottom shows "Ayuda" link |
| 4 | Click "Ayuda" in the footer | Navigates to `/ayuda` |
| 5 | Navigate to `http://localhost:3000/this-route-definitely-does-not-exist` | 404 page renders: "Página no encontrada" + "Volver al inicio" button + "¿Necesitás ayuda?" link to `/ayuda` |
| 6 | Click "¿Necesitás ayuda?" on the 404 page | Navigates to `/ayuda` |

## Progress Tracking

- [x] Task 1: Extract Disclosure primitives to shared module
- [x] Task 2: Create `/ayuda` page with full layout + FAQ content + contact card
- [x] Task 3: Add `/ayuda` discoverability links to 4 existing files
- [x] Task 4: Create `app/not-found.tsx`

**Total Tasks:** 4 | **Completed:** 4 | **Remaining:** 0

## Implementation Tasks

### Task 1: Extract Disclosure primitives to shared module

**Objective:** Move `DisclosureItem`, `Chevron`, and their type shapes out of `app/components/TermsAndPrivacyPage.tsx` into a new shared module `app/components/ui/Disclosure.tsx`. Rename types from `LegalDisclosure` → `DisclosureEntry` and `LegalGroup` → `DisclosureGroup`. Update `TermsAndPrivacyPage` to import from the new module. Verify no visual regression on `/terminosyprivacidad`.

**Dependencies:** None
**Mapped Scenarios:** TS-001

**Files:**

- Create: `app/components/ui/Disclosure.tsx`
- Modify: `app/components/TermsAndPrivacyPage.tsx`
- (Possibly modify): wherever `LegalDisclosure` / `LegalGroup` data is defined — likely `app/terminosyprivacidad/page.tsx` if the data lives inline there. Verify before changing.

**Key Decisions / Notes:**

- `app/components/ui/Disclosure.tsx` keeps `'use client'` at the top (carried over from `TermsAndPrivacyPage.tsx:1`).
- Export named: `Chevron`, `DisclosureItem`, plus the type names `DisclosureEntry` and `DisclosureGroup`.
- `DisclosureEntry` shape stays identical to `LegalDisclosure`: `{ title: string; paragraphs: readonly string[]; bullets?: readonly string[] }`.
- `DisclosureGroup` shape stays identical to `LegalGroup`: `{ id: string; title: string; intro: string; disclosures: readonly DisclosureEntry[] }`.
- `TermsAndPrivacyPage.tsx` keeps its component-level prop type `TermsAndPrivacyPageProps` but switches `LegalGroup` references to `DisclosureGroup` (or aliases via `type LegalGroup = DisclosureGroup` if the data file at the call site still uses the old name; prefer renaming the data file too for consistency).
- Verify by running the page in dev: `/terminosyprivacidad` looks pixel-identical to before, accordion expand/collapse works.
- **Lineage test — extraction only.** The anchor pill nav in `TermsAndPrivacyPage.tsx:118-131` is **hardcoded** to `#terminos` and `#privacidad` (not data-driven from `groups`). Do NOT generalize the pills as part of this task — `/ayuda` will have its own hardcoded pills for `#usuarios` and `#profesionales`. Resist the temptation to "DRY up" the pill nav into a reusable component; the page-level shells are intentionally separate (see Approach C rejection).

**Definition of Done:**

- [ ] `app/components/ui/Disclosure.tsx` exists, exports `Chevron`, `DisclosureItem`, `DisclosureEntry`, `DisclosureGroup`.
- [ ] `TermsAndPrivacyPage.tsx` no longer contains `function Chevron`, `function DisclosureItem`, or the `LegalDisclosure` / `LegalGroup` type definitions — they're imported from the new module.
- [ ] All call sites that referenced `LegalDisclosure` / `LegalGroup` either import the new names from `@/app/components/ui/Disclosure` or use the new names directly.
- [ ] `npm run dev` succeeds; `/terminosyprivacidad` renders identically (visual check + accordion interaction).
- [ ] `npm run lint` clean.
- [ ] TypeScript compiles (`tsc --noEmit` clean).

**Verify:**

- `npm run dev` then navigate to `/terminosyprivacidad` and click an accordion entry — chevron rotates, content expands. Click again — collapses.
- `npm run lint`
- `npx tsc --noEmit`

---

### Task 2: Create `/ayuda` page with full layout + FAQ content + contact card

**Objective:** Implement the new `/ayuda` page at `app/ayuda/page.tsx`, using the extracted Disclosure primitives and matching `TermsAndPrivacyPage`'s exact visual structure. Two `<GlassCard>` sections (Para usuarios, Para profesionales) each containing the draft FAQ entries from the PRD. A third `<GlassCard>` at the bottom serves as the contact card with email + Instagram links.

**Dependencies:** Task 1
**Mapped Scenarios:** TS-002, TS-003 (steps 3-4)

**Files:**

- Create: `app/ayuda/page.tsx`

**Key Decisions / Notes:**

- Page is a **server component** — no `'use client'` at the top. The imported `<DisclosureItem>` carries client-side state internally; the page itself is static SSR.
- Use the same shell as `TermsAndPrivacyPage.tsx:92-160`:
  ```
  <div className="min-h-screen bg-background">
    <PageBackground />
    <div className="relative z-10 max-w-md md:max-w-[960px] mx-auto px-4 pt-8 pb-12">
      <Link href="/" className="inline-flex items-center text-sm text-muted hover:text-foreground transition-colors mb-6">
        ← Volver al inicio
      </Link>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Ayuda</p>
      <h1 className="text-3xl font-semibold text-foreground leading-tight mb-3">¿En qué te podemos ayudar?</h1>
      <p className="text-base text-muted leading-relaxed mb-4">Acá te dejamos las preguntas más comunes y cómo escribirnos si necesitás algo más.</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
        <a href="#usuarios" className="text-sm text-muted hover:text-foreground transition-colors">Para usuarios</a>
        <a href="#profesionales" className="text-sm text-muted hover:text-foreground transition-colors">Para profesionales</a>
      </div>
      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.id} id={group.id} className="scroll-mt-8">
            <GlassCard>
              <h2 className="text-xl font-semibold text-foreground mb-2">{group.title}</h2>
              <p className="text-sm text-muted leading-relaxed mb-5">{group.intro}</p>
              <div className="space-y-2">
                {group.disclosures.map((disclosure) => (
                  <DisclosureItem key={disclosure.title} {...disclosure} />
                ))}
              </div>
            </GlassCard>
          </section>
        ))}
        <GlassCard>
          <h2 className="text-xl font-semibold text-foreground mb-2">¿Necesitás escribirnos?</h2>
          <p className="text-sm text-muted leading-relaxed mb-5">Por email o por Instagram. Te respondemos lo antes que podamos.</p>
          <div className="flex flex-col gap-3">
            <a href="mailto:centrovitalhara@gmail.com" className="text-sm font-semibold text-brand hover:underline">centrovitalhara@gmail.com</a>
            <a href="https://instagram.com/haravital" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand hover:underline">@haravital en Instagram</a>
          </div>
        </GlassCard>
      </div>
    </div>
  </div>
  ```
- FAQ data lives inline in this page file as `const groups: readonly DisclosureGroup[] = [...]`. Per the PRD's Open Questions, defer extraction to a separate data module unless a second consumer appears.
- Draft FAQ content (Spanish, Argentine informal):
  - **Para usuarios** (`id: "usuarios"`, title "Para usuarios", intro "Las preguntas más frecuentes de quienes buscan acompañamiento."):
    1. "¿Cómo contacto a un profesional?" — "Elegís un profesional desde el directorio o desde tu link de recomendaciones y le escribís por WhatsApp con un toque del botón. Tu info no se comparte hasta que vos escribís."
    2. "¿Mi información se comparte sin mi permiso?" — "No. Tu nombre, teléfono y email se comparten solamente cuando vos abrís la conversación por WhatsApp. Hasta ese momento, nadie ve tus datos."
    3. "¿Cómo se eligen los profesionales que aparecen?" — "Cada profesional pasa por una revisión antes de aparecer. Los ordenamos por reputación, basada en reseñas reales de personas que efectivamente los contactaron."
    4. "Si recibiste un link de recomendaciones y lo perdiste, ¿cómo lo recupero?" — "Escribinos por email a centrovitalhara@gmail.com o por Instagram (@haravital) con tu nombre y el email o teléfono que usaste, y te lo reenviamos."
    5. "¿Cuánto cuesta usar Hara Vital?" — "Para vos como usuario, nada. Los profesionales pueden pagar por aparecer destacados; vos no pagás nada."
    6. "Tuve un problema con un profesional, ¿qué hago?" — "Escribinos por email o Instagram con el nombre del profesional y qué pasó. Lo revisamos."
  - **Para profesionales** (`id: "profesionales"`, title "Para profesionales", intro "Si querés sumarte o ya estás en Hara Vital, esto te puede servir."):
    1. "¿Cómo me registro?" — "En `/profesionales/registro`. El formulario tiene 4 pasos y te lleva 5-10 minutos."
    2. "¿Cuánto tarda la revisión de mi solicitud?" — "Las revisamos lo más rápido que podemos. Si pasó más de una semana y no recibiste respuesta, escribinos."
    3. "Mi solicitud fue rechazada, ¿qué hago?" — "Recibís un email con el motivo y la fecha desde la que podés volver a aplicar (60 días después del rechazo). Si necesitás más contexto, escribinos."
    4. "¿Cómo edito mi perfil?" — "Por ahora, escribinos por email con los cambios y los aplicamos. Estamos trabajando en un panel propio."
    5. "¿Cuánto cuesta estar en Hara Vital?" — "El tier Básico es gratis. El tier Destacado es pago — aparecés más arriba y con un distintivo. Escribinos para el detalle de precios."
    6. "¿Cómo me llegan los clientes?" — "Te contactan directamente por WhatsApp cuando eligen tu perfil. No hay intermediarios."

- Final copy is subject to Bel's review during the implementation TDD cycle — these are starting points, not gospel.
- **No `force-static` or `force-dynamic`** for now — Next.js will static-render this page by default since there's no `cookies()`, `headers()`, or dynamic data fetching. Leave it as default.

**Definition of Done:**

- [ ] `app/ayuda/page.tsx` exists, exports a default `AyudaPage` server component.
- [ ] Page renders identically to `/terminosyprivacidad` in structure (back link, eyebrow, H1, intro, pill nav, GlassCard sections, accordion entries inside).
- [ ] Two FAQ sections (Para usuarios, Para profesionales) with the 12 draft entries.
- [ ] Contact GlassCard at the bottom with working `mailto:` link to `centrovitalhara@gmail.com` and `https://instagram.com/haravital` link (target `_blank`, `rel="noopener noreferrer"`).
- [ ] Anchor pill nav links jump to `#usuarios` and `#profesionales`.
- [ ] Page DOM does NOT contain the strings "concierge" or "/solicitar".
- [ ] **`http://localhost:3000/profesionales/registro` returns 200 and renders the registration form** (pro FAQ #1 references this route; verify it isn't gated/redirecting before merge). If gated, update FAQ #1 to drop the direct link and use email-contact fallback.
- [ ] `npm run dev`: visit `/ayuda`, all interactions work.
- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` clean.

**Verify:**

- Visit `/ayuda` in dev; expand multiple FAQ entries; click pill nav; click email link (verify `mailto:` opens client); click IG link (verify URL).
- `grep -iE "(concierge|/solicitar)" app/ayuda/page.tsx` returns empty.
- `npm run lint && npx tsc --noEmit`

---

### Task 3: Add `/ayuda` discoverability links to 4 existing files

**Objective:** Surface the `/ayuda` link in the four places where users actually need it: public footer (always visible), generic error page (when something breaks), `/r/[tracking_code]` error state (lost-link recovery path), and the current Próximamente homepage (catches anyone who landed there confused).

**Dependencies:** Task 2 (links must point to a live route)
**Mapped Scenarios:** TS-003 (step 1), TS-004 (steps 1-4)

**Files:**

- Modify: `app/components/PublicLayout.tsx` — footer
- Modify: `app/error.tsx` — error card
- Modify: `app/r/[tracking_code]/page.tsx` — error state line replacement
- Modify: `app/page.tsx` — Próximamente homepage

**Key Decisions / Notes:**

- **PublicLayout footer** (`app/components/PublicLayout.tsx:29-35`):
  - Current footer is a single centered `<p>` with copyright. Add a small inline link.
  - Suggested markup:
    ```tsx
    <footer className="bg-surface border-t border-outline mt-auto">
      <div className="container-public py-8 text-center">
        <p className="text-sm text-muted">
          © 2026 Hara Vital · Conectamos con bienestar
        </p>
        <Link href="/ayuda" className="text-sm text-muted hover:text-foreground transition-colors mt-2 inline-block">
          Ayuda
        </Link>
      </div>
    </footer>
    ```
  - Import `next/link` if not already imported.

- **`app/error.tsx`** — The file currently has **two** buttons stacked vertically inside the card:
  - Primary: `Intentar de nuevo` (`error.tsx:57-62`, `onClick={() => reset()}`)
  - Secondary: `Volver al inicio` (`error.tsx:64-69`, `onClick={() => (window.location.href = '/')}`)

  Add the `¿Necesitás ayuda?` link as a **third element below both buttons** — not between them, not replacing either. The visual stack becomes: `Intentar de nuevo` (primary CTA) → `Volver al inicio` (secondary) → `¿Necesitás ayuda?` (tertiary, smallest weight):
    ```tsx
    <button
      onClick={() => (window.location.href = '/')}
      className="w-full text-muted hover:text-foreground transition-colors text-sm py-2"
    >
      Volver al inicio
    </button>
    <Link href="/ayuda" className="block text-muted hover:text-foreground transition-colors text-sm py-2">
      ¿Necesitás ayuda?
    </Link>
    ```
  - Import `next/link` (currently the file uses `window.location.href` for nav; `<Link>` is appropriate for `/ayuda` to leverage prefetch).

- **`app/r/[tracking_code]/page.tsx:68-69`** — Preserve the **expired-vs-transient distinction** (don't collapse both branches to the same message — transient/network errors aren't "lost links"). Surface `/ayuda` in both, with appropriate wording per branch:
  - Before:
    ```tsx
    <p className="text-muted leading-relaxed mb-6">
      {error === 'expired' ? 'Pedí uno nuevo por email.' : 'Probá de nuevo.'}
    </p>
    ```
  - After:
    ```tsx
    <p className="text-muted leading-relaxed mb-6">
      {error === 'expired' ? (
        <>
          ¿Perdiste tu link?{' '}
          <Link href="/ayuda" className="text-brand hover:underline">
            Visitá /ayuda
          </Link>
        </>
      ) : (
        <>
          Probá de nuevo.{' '}
          <Link href="/ayuda" className="text-brand hover:underline">
            ¿Necesitás ayuda?
          </Link>
        </>
      )}
    </p>
    ```
  - **Expired** → "¿Perdiste tu link? Visitá /ayuda" — directly funnels the user to recovery.
  - **Transient (network / other)** → "Probá de nuevo. ¿Necesitás ayuda?" — keeps the existing "try again" semantic (still actionable via the Reintentar button) and offers /ayuda as a secondary affordance.
  - Import `Link` from `next/link` at the top (currently uses `useParams` from `next/navigation`; `Link` import is new).

- **`app/page.tsx`** — Próximamente. Wrap both the existing privacy line and the new help link in a single bottom-aligned container so flex semantics work correctly (`inline-block` and `text-center` are no-ops on a flex child by themselves):
  - Before (`app/page.tsx:37-39`):
    ```tsx
    <p className="text-xs text-muted text-center mt-auto pt-6">
      Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.
    </p>
    ```
  - After:
    ```tsx
    <div className="mt-auto pt-6 text-center space-y-2">
      <p className="text-xs text-muted">
        Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.
      </p>
      <Link href="/ayuda" className="text-xs text-muted hover:text-foreground transition-colors">
        ¿Necesitás ayuda?
      </Link>
    </div>
    ```
  - The wrapping `<div>` carries `mt-auto pt-6 text-center` (the original layout intent), and `space-y-2` adds vertical rhythm between the two lines. The `<p>` and `<Link>` no longer need their own positioning classes.
  - Import `Link` from `next/link` (file currently imports `WaitlistForm` + `PageBackground`; `Link` import is new).
  - Visually small and bottom-aligned — does not promote "we're open"; just a help affordance.

**Definition of Done:**

- [ ] `PublicLayout.tsx` footer renders the "Ayuda" link below the copyright; clicking it navigates to `/ayuda`.
- [ ] `app/error.tsx` shows "¿Necesitás ayuda?" link below "Volver al inicio"; clicking navigates to `/ayuda`. Trigger an error (e.g., visit a route that throws) to verify.
- [ ] `/r/[tracking_code]/INVALID123` error card shows the new "¿Perdiste tu link? Visitá /ayuda" line with `/ayuda` as a working link. The "Reintentar" button is still present.
- [ ] `app/page.tsx` (Próximamente) shows the small "¿Necesitás ayuda?" link below the privacy line; clicking navigates to `/ayuda`.
- [ ] All 4 link `href`s use `/ayuda` (not `/help`, not `/ayuda/`); no broken paths.
- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` clean.

**Verify:**

- Visit each of the 4 surfaces in dev, click each link, confirm `/ayuda` loads.
- `grep -n "/ayuda" app/components/PublicLayout.tsx app/error.tsx app/r/\[tracking_code\]/page.tsx app/page.tsx` — should return 4 matches (one per file).
- `npm run lint && npx tsc --noEmit`

---

### Task 4: Create `app/not-found.tsx`

**Objective:** Add a global 404 page that renders when any URL doesn't match a route. Mirror the shell of `app/error.tsx` (same min-h-screen card layout), with text adapted for "not found" and a `/ayuda` link.

**Dependencies:** Task 2
**Mapped Scenarios:** TS-004 (steps 5-6)

**Files:**

- Create: `app/not-found.tsx`

**Key Decisions / Notes:**

- Next.js App Router convention: `app/not-found.tsx` is the global 404 boundary. No special config needed.
- Reuse the visual shell from `app/error.tsx:22-72` (`<div className="min-h-screen bg-background flex items-center justify-center p-4">` etc.), but:
  - Heading: "Página no encontrada"
  - Body: "No encontramos esta página. Puede que el link esté roto o que la dirección haya cambiado."
  - **Keep the exact SVG icon and background circle from `error.tsx:23-43`** (`bg-danger-weak` circle + warning-triangle SVG). Do NOT swap for a question-mark icon — the project has no icon library imported (verified: no `lucide-react`, no `heroicons` in dependencies), and hand-crafting a question-mark SVG is out of scope. Visual consistency with `error.tsx` wins; literal icon-semantic correctness loses.
  - Remove the "Intentar de nuevo" reset button (`error.tsx:57-62` — 404 has nothing to reset).
  - Keep the "Volver al inicio" button (`error.tsx:64-69`).
  - Add a "¿Necesitás ayuda?" link to `/ayuda` below "Volver al inicio" (matching the third-element pattern from Task 3's error.tsx change).
- Server component is fine; no client interactivity needed.

**Definition of Done:**

- [ ] `app/not-found.tsx` exists, exports a default `NotFound` component.
- [ ] Visiting any non-existent route (e.g., `/this-does-not-exist`) renders the 404 page with the heading, body, "Volver al inicio" button, and "¿Necesitás ayuda?" link.
- [ ] Clicking "Volver al inicio" navigates to `/`.
- [ ] Clicking "¿Necesitás ayuda?" navigates to `/ayuda`.
- [ ] Visual treatment matches `app/error.tsx` (same card shell, same color tokens).
- [ ] `npm run lint` clean.
- [ ] `npx tsc --noEmit` clean.

**Verify:**

- Visit `http://localhost:3000/random-nonexistent-route` in dev; confirm the 404 page renders.
- Click each of the two affordances; confirm navigation.
- `npm run lint && npx tsc --noEmit`

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | PASS | 0 | /terminosyprivacidad renders correctly, accordion expands post-extraction |
| TS-002 | Critical | PASS | 0 | /ayuda full structure verified, link-recovery FAQ expands, contact hrefs correct |
| TS-003 | Critical | PASS | 0 | /r/INVALID123 error state shows ¿Necesitás ayuda? link; navigates to /ayuda |
| TS-004 | High | PASS (1 fix) | 1 | Found PublicLayout has zero consumers — footer link was dead code. Fixed inline: added footer directly to /profesionales/page.tsx. All 4 surfaces verified. |

**TS-004 fix note:** `app/components/PublicLayout.tsx` exists but no public page imports it — each page builds its own shell. The footer Ayuda link in PublicLayout was unreachable. Fix: added a `<footer>` block at the bottom of `/profesionales/page.tsx` directly. `PublicLayout` adoption across all public pages is a separate future cleanup item.

## Open Questions

- **Instagram handle `@haravital` registration status** — needs verification before merge. If unregistered, drop the IG line from `/ayuda` contact card and ship email-only. Task 2 will surface this during implementation.
- **Final FAQ wording** — drafts above are starting points; Bel reviews during TDD cycle. Particular attention to: pro FAQ #2 ("Cuánto tarda la revisión") wording (avoid hard SLA), user FAQ #5 (price wording).
