# Wording Pass — Soft Launch Push Item 7 Implementation Plan

Created: 2026-05-13
Author: belu.montoya@dialpad.com
Status: PENDING
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Apply the Hara Vital brand voice to every user-facing surface (~18 files). Claude writes all final Spanish copy anchored on the voice contract in `docs/prd/2026-05-12-wording-pass.md` (§ Voice). Bel reviews at the Code Review Gate.

## Approach

**Chosen:** Per-surface in-file `Edit` pass, grouped into 9 tasks by flow, shipped as one big commit.
**Why:** Copy-only changes across known files — no new components, no schema. One commit per Bel's choice (fastest review for a homogeneous change). Grouping by flow (home, directory, concierge, registration, recommendations, components, emails, legal/aux, tests) keeps each task independently verifiable in dev server while preserving the cross-surface voice contract.

## Autonomous Decisions

- **Skipped Batch 2 design questions.** PRD already specifies voice (8 principles + canonical phrases), surface inventory (17 items), and out-of-scope (admin pages, legal substance, other Spanish variants). Nothing left to decide architecturally.
- **No CodeGraph deep-dive.** Copy edits on enumerated files; the PRD's per-surface table IS the file map.
- **Voice authority.** Brand voice doc inside the PRD (`docs/prd/2026-05-12-wording-pass.md` §Voice) is the contract. The 6 voice tests at the end of that section are the per-line pass/fail check.

## Out of Scope

- Admin pages (`/admin/*`) — internal tooling, different audience.
- Legal substance in `/terminosyprivacidad` — voseo-sweep only; keep substance untouched.
- Other Spanish variants (Spain *tú*, Mexico *tú*) — Argentine voseo only.
- Translation of admin-facing email templates (`notifyNewProfessional`).
- Image/asset changes.
- Component refactors — only string changes.

## Context for Implementer

The voice contract is **the PRD §Voice section**, not this plan. Read it once before starting. Every line written during implementation must pass the 6 voice tests at the end of that section. When unsure between two phrasings, the tie-breaker is: which sounds more like presence from the *hara* — calm, unhurried, attended?

When a file contains strings the PRD didn't enumerate, apply the voice tests and rewrite if it improves warmth (per Batch 1 answer: "Rewrite for warmth wherever I can improve it"). The PRD's per-surface table captures the highest-impact lines, not the only ones in scope.

## Goal Verification

### Truths

1. Every user-facing surface (the 17 in the PRD) reads as if written by one person in calm Argentine voseo — no banner-speak rhetorical questions, no filler adjectives, no clinical formality, no pre-pivot psychotherapy framing.
2. The privacy promise (*"Tu info se comparte recién cuando vos escribís"* or natural variant) appears at every friction point where a user shares data (forms, contact CTA, intake) — not buried at page bottom.
3. Marketplace leads every CTA stack; concierge is present but never positioned as the primary path (per PRODUCT.md visibility constraint).

## E2E Test Scenarios

### TS-001: Próximamente home shows new hero + waitlist copy
**Priority:** Critical
**Preconditions:** Dev server running on localhost:3000
**Mapped Tasks:** Task 1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/` | Page renders without errors |
| 2 | Read H1 + subtitle | New copy — names "bienestar holístico" specifically, no "estamos creando un espacio donde…" filler structure |
| 3 | Read waitlist card prompt | No rhetorical question. Direct instruction in voseo. |
| 4 | Read footer | Privacy line present, "¿Necesitás ayuda?" link intact |

### TS-002: /preview shows new hero + marketplace-first CTAs
**Priority:** Critical
**Preconditions:** Dev server running
**Mapped Tasks:** Task 1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/preview` | Page renders |
| 2 | Read H1 | No "terapeuta" word. Names holistic positioning. |
| 3 | Read subtitle | No filler triple ("personalizadas / verificados / profesionales") |
| 4 | Inspect CTA order | "Ver profesionales" is FIRST (primary brand button); "Solicitar recomendaciones" is SECOND; "Sumate como profesional" is THIRD |
| 5 | Click "Ver profesionales" | Navigates to `/profesionales` |

### TS-003: /profesionales directory header carries privacy promise
**Priority:** Critical
**Preconditions:** Dev server, at least one active professional in DB (or test the empty state)
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profesionales` | Page renders |
| 2 | Read H1 + subtitle | H1 contains a trust signal ("verificados" or equivalent); subtitle includes the inline privacy promise |
| 3 | Read empty state if applicable | Positive framing ("Estamos sumando…"), not negative ("No hay…") |

### TS-004: /solicitar intake form reflects holistic framing
**Priority:** High
**Preconditions:** Dev server
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/solicitar` | Form renders |
| 2 | Read intro/step prompts | No "terapeuta" framing; references holistic practices or calm-acompañamiento language |
| 3 | Submit form (with test data) | Lands on `/gracias` — copy still aligned per Item 2 fix |

### TS-005: Error boundary + 404 use calm voice
**Priority:** High
**Preconditions:** Dev server
**Mapped Tasks:** Task 8

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/some-nonexistent-path` | Renders 404 page with calm copy + /ayuda link |
| 2 | Trigger an error (e.g., visit `/r/INVALID123`) | Error UI shows new copy: less "inesperado" alarm, voseo CTAs intact |

### TS-006: Email templates render in new voice (manual via test send)
**Priority:** High
**Preconditions:** Dev server + Resend test-mode capability (or read templates rendered in-browser preview)
**Mapped Tasks:** Task 7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Inspect `notifyRegistrationReceived` rendered HTML | Voseo + warm tone, sets expectation matching `/ayuda` FAQ #2 |
| 2 | Inspect `notifyProApproved` rendered HTML | "Te damos la bienvenida" (gender-neutral); no psychotherapy framing |
| 3 | Inspect `notifyProRejected` rendered HTML | Warm tone; reason interpolated grammatically; resubmit date phrased naturally |
| 4 | Inspect `sendReviewRequest` rendered HTML | Voseo, review CTA warm not transactional |

## Progress Tracking

- [x] Task 1: Home + /preview hero + Próximamente waitlist card
- [x] Task 2: /profesionales directory header + empty state
- [x] Task 3: /solicitar intake form + /gracias verification
- [x] Task 4: /profesionales/registro form + /confirmacion page
- [x] Task 5: Professional profile (`/p/[slug]`) + recommendations (`/r/[tracking_code]`) + review (`/r/review/[token]`)
- [x] Task 6: Components (ContactButton + WaitlistForm)
- [x] Task 7: Email templates (`lib/email.ts` user-facing functions)
- [x] Task 8: Error boundary + 404 + /ayuda verification + legal page voseo-sweep
- [ ] Task 9: E2E test assertion sweep + dev server smoke + commit

## Implementation Tasks

### Task 1: Home + /preview hero + Próximamente waitlist card

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/preview/page.tsx`

**Key Decisions / Notes:**
- `app/page.tsx`: rewrite the subtitle on line 23-25 (drop "estamos creando un espacio donde…" structure), rewrite waitlist card prompt on line 30-34 (NO rhetorical question), keep the canonical privacy line on line 40 as-is.
- `app/preview/page.tsx`: rewrite H1 line 17 (no "terapeuta"), rewrite subtitle line 20 (no filler triple), **reorder CTAs** lines 24-43 so `/profesionales` is primary, `/solicitar` is secondary, `/profesionales/registro` is tertiary; also fix CTA label on line 41 ("Únete" → "Sumate" — voseo); rewrite step labels lines 57, 67, 77 + descriptions lines 58, 68, 78 (audit each for warmth).
- The "Cómo funciona" header on line 48 stays.

**Definition of Done:**
- [ ] All H1s + subtitles on both pages pass the 6 voice tests
- [ ] /preview CTA order is marketplace-first
- [ ] Privacy line + "¿Necesitás ayuda?" footer link still render on /
- [ ] Verify: `npm run build` clean + manual visit to `/` and `/preview` in dev server

### Task 2: /profesionales directory header + empty state

**Files:**
- Modify: `app/profesionales/page.tsx`

**Key Decisions / Notes:**
- Rewrite H1 line 87 to include a trust signal.
- Rewrite subtitle line 88 to include the inline privacy promise.
- Rewrite empty state title/description lines 95-97 to positive framing ("Estamos sumando profesionales…" pattern).
- Card metadata strings (`reseña` / `reseñas`, `Online` / `Presencial`, `desde` / `hasta`) stay — they're labels, not voice surfaces.

**Definition of Done:**
- [ ] H1 + subtitle pass voice tests, privacy promise visible inline
- [ ] Empty state reframed to positive
- [ ] Verify: visit `/profesionales` in dev server, confirm both populated and empty states render

### Task 3: /solicitar intake form + /gracias verification

**Files:**
- Modify: `app/solicitar/SolicitarForm.tsx`
- Modify: `app/solicitar/page.tsx` (server-component wrapper — verify any intro strings)
- Verify: `app/gracias/page.tsx` (PRD says keep — confirm)

**Key Decisions / Notes:**
- Audit all form labels, helper text, placeholders, validation messages, submit button, step prompts.
- Watch for over-promise wording ("encontraremos al profesional perfecto") — replace with calm acompañamiento phrasing per concierge visibility constraint.
- Audit `STYLE_OPTIONS` / practice picker copy if any user-facing strings live there.
- `/gracias` was aligned 2026-05-07 (Item 2). Verify the 3-step list + privacy line + "Te escribimos cuando tengamos tus 3 opciones" still read aligned with the new voice — adjust only if a phrase now feels off against rewritten surrounding pages.

**Definition of Done:**
- [ ] All `SolicitarForm` strings pass voice tests
- [ ] `/gracias` confirmed aligned (or adjusted minimally)
- [ ] Verify: complete the `/solicitar` flow end-to-end in dev server

### Task 4: /profesionales/registro form + /confirmacion page

**Files:**
- Modify: `app/profesionales/registro/RegistroForm.tsx`
- Modify: `app/profesionales/registro/page.tsx` (server-component wrapper)
- Modify: `app/profesionales/registro/confirmacion/page.tsx`

**Key Decisions / Notes:**
- 4-step form has step titles, field labels, helper text, validation errors, submit button, success state. Full sweep.
- Voseo on ALL instructions ("Necesitamos tu email" not "El email es requerido").
- Confirmation page references the email they'll receive — align expectation phrasing with `/ayuda` FAQ #2 ("lo antes que podamos" or equivalent).
- Gender-neutral where natural ("Te damos la bienvenida" pattern).

**Definition of Done:**
- [ ] All form strings + confirmation page strings pass voice tests
- [ ] Verify: walk the 4-step registration flow in dev server + visit `/confirmacion`

### Task 5: Profile, recommendations, review pages

**Files:**
- Modify: `app/p/[slug]/page.tsx`
- Modify: `app/r/[tracking_code]/page.tsx`
- Modify: `app/r/review/[token]/page.tsx`

**Key Decisions / Notes:**
- `/p/[slug]`: section labels ("Sobre mí", "Especialidades", "Prácticas"), empty/missing-data states, contact-area context. No "terapeuta" in any label.
- `/r/[tracking_code]`: reveal screen / deck intro copy, error states (expired vs transient — preserved during Item 8), bottom sheet professional details.
- `/r/review/[token]`: review prompt, submit success, already-submitted, expired states. Warm, voseo, no clinical "rate this professional" framing.

**Definition of Done:**
- [ ] All three pages pass voice tests in every state (valid/expired/error/empty)
- [ ] Verify: visit each route with valid and invalid params in dev server

### Task 6: Components (ContactButton + WaitlistForm)

**Files:**
- Modify: `app/components/ContactButton.tsx`
- Modify: `app/components/WaitlistForm.tsx`

**Key Decisions / Notes:**
- `ContactButton`: WhatsApp CTA label + inline privacy note. The privacy line should sit visually next to the button, not in fine print elsewhere.
- `WaitlistForm`: button label (no "Suscribir"), success state, error states. Voseo throughout.

**Definition of Done:**
- [ ] Both components' user-facing strings pass voice tests
- [ ] Verify: render both components in dev (ContactButton on `/p/[slug]` or `/r/[tracking_code]`; WaitlistForm on `/`)

### Task 7: Email templates (`lib/email.ts` user-facing functions)

**Files:**
- Modify: `lib/email.ts`

**Key Decisions / Notes:**
- Functions in scope: `notifyRegistrationReceived`, `notifyProApproved`, `notifyProRejected`, `sendReviewRequest`. Plus any other user-facing template in the file.
- `notifyNewProfessional` is admin-only — **skip**.
- Subject lines + HTML body + plain-text fallback (if present) all rewritten.
- `notifyProRejected`: verify `rejection_reason` interpolation reads naturally in Spanish; resubmit-after date phrased like "Podés volver a aplicar a partir del [fecha]" (already in place per Item 3).
- `sendReviewRequest`: "Hace una semana contactaste a…" — warm, calm, non-transactional CTA.

**Definition of Done:**
- [ ] All four user-facing email templates pass voice tests
- [ ] HTML strings remain XSS-safe (`escapeHtml()` still applied where user input is interpolated)
- [ ] Verify: render templates via the existing test file (`lib/email.test.ts`) — tests should still pass after subject/body string updates (will need assertion updates)

### Task 8: Error boundary + 404 + /ayuda verification + legal page voseo-sweep

**Files:**
- Modify: `app/error.tsx`
- Modify: `app/not-found.tsx`
- Verify: `app/ayuda/page.tsx` (just shipped — verify no drift)
- Modify (light touch): `app/terminosyprivacidad/page.tsx`
- Modify (light touch): `app/components/TermsAndPrivacyPage.tsx`

**Key Decisions / Notes:**
- `error.tsx`: rewrite "Ocurrió un error inesperado…" → calmer, less alarm. Keep H1 "Algo salió mal" + the 3 CTA buttons.
- `not-found.tsx`: PRD says keep. Verify no drift.
- `/ayuda`: just shipped 2026-05-12 in the voice. Verify no surface drifted post-rewrites elsewhere.
- Legal page: **light touch only**. Voseo where present, no rewrites to legal substance.

**Definition of Done:**
- [ ] `error.tsx` calm-voice rewrite applied
- [ ] `/ayuda` confirmed unchanged
- [ ] Legal page voseo-sweep applied (or confirmed no changes needed)
- [ ] Verify: trigger error boundary in dev; visit `/some-404`; visit `/ayuda`; visit `/terminosyprivacidad`

### Task 9: E2E test assertion sweep + dev server smoke + commit

**Files:**
- Modify: `__tests__/e2e/*.spec.ts` (whichever assert on changed Spanish strings)
- Verify: `npm run build`, `npm run lint`, `npm test -- --silent`

**Key Decisions / Notes:**
- After Tasks 1-8 land, `grep -r "<old string>" __tests__/e2e/` for each changed string. Update assertions in lockstep.
- Run full unit test suite (251 tests baseline) — fix any that break on changed strings (e.g., `lib/email.test.ts` likely needs subject-line updates).
- Run Playwright E2E specs locally; update assertions until green.
- Dev server smoke: visit each of the 17 surfaces once. No layout breakage (Spanish strings can wrap differently after rewrites).
- After all greens: single commit `feat(copy): final wording pass across all user-facing surfaces (Soft Launch Push Item 7)`.

**Definition of Done:**
- [ ] All unit tests green (≥ 251)
- [ ] All E2E tests green
- [ ] `npm run build` clean
- [ ] `npm run lint` clean
- [ ] Dev-server smoke completed on all 17 surfaces (no layout breakage)
- [ ] Single commit created on `main`
- [ ] Verify: `git log -1 --stat` shows the commit; `npm run build && npm test -- --silent`

## Assumptions

- The PRD §Voice section (in `docs/prd/2026-05-12-wording-pass.md`) is the canonical voice contract. Task 1 onward depends on this assumption.
- `lib/email.test.ts` asserts on subject lines / body fragments that will change — Task 7 must update them in the same task, not Task 9. (Tasks 7 and 9 both depend on this.)
- No `npm install` needed — pure string edits.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Spanish strings wrap differently and break responsive layout (esp. mobile) | Medium | Medium | Task 9 dev-server smoke covers each surface at mobile + desktop widths before commit |
| Test assertions fail on changed strings and slip past local verification | Medium | High | Task 9 explicitly runs `npm test` and Playwright; commit is gated on green |
| Voice inconsistency between surfaces written early vs. late in the pass | Low | Medium | All rewrites anchor on the PRD §Voice section; the 6 voice tests are applied per-line, not per-task |
| `escapeHtml()` skipped on an email-template rewrite, introducing XSS | Low | High | Task 7 DoD requires confirming `escapeHtml()` is still applied where user input is interpolated (`rejection_reason`, professional names) |

## Open Questions

None — Batch 1 settled chunking, rewrite scope, and test handling. PRD settled voice, surfaces, and out-of-scope.
