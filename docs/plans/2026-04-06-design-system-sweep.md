# Design System Sweep — All App Pages

Created: 2026-04-06
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Every page in the app uses the same visual language: glass cards, PageBackground, design tokens, Spanish copy. No hardcoded colors, no Tailwind grays, no English UI text.

**Architecture:** Page-by-page migration to existing components (GlassCard, PageBackground, Modal, Badge, Button, Alert) and token classes. Extract duplicated constants and oversized components.

**Tech Stack:** Tailwind CSS v4 tokens, existing UI components in `app/components/ui/`

## Scope

### In Scope

- Replace all hardcoded `#FBF7F2` with `PageBackground` component (7 files)
- Replace all Tailwind grays/blues/reds with design tokens (2 fully unstyled pages)
- Replace raw HTML modals with `Modal` component
- Translate all English copy to Spanish (Argentine informal)
- Fix `any` types in catch blocks (2 files)
- Extract `ScoreRing` + `ScoreBreakdown` from review page (522 → under 440 lines)
- Extract duplicated `MODALITY_MAP`, `STYLE_MAP`, `STATUS_CONFIG` to shared location
- Show profile image on admin review page
- Normalize `border-white/30` → `border-outline/30` on glass cards (consistency with GlassCard component)

### Out of Scope

- `/ui` page (dev kitchen sink — not user-facing)
- Registration form refactor (807 lines — separate task, flagged in plan)
- New features, new pages, new components
- Layout wrapper decisions (AdminLayout / PublicLayout usage stays as-is)
- Background illustration choice (keep what each page already uses)

## Approach

**Chosen:** Direct migration — replace raw markup with existing components, replace non-token classes with token classes. No new abstractions.

**Why:** Every component already exists (GlassCard, PageBackground, Modal, Badge, Button, Alert). This is a find-and-replace sweep, not an architecture change. Lowest risk, highest consistency.

**Alternatives considered:**
- Create new wrapper components to standardize patterns → rejected, YAGNI — existing components already do the job
- Batch all admin pages into AdminLayout first → rejected, user clarified the design system is glass cards + tokens, not layout wrappers

## Context for Implementer

**Patterns to follow:**
- `app/admin/login/page.tsx` — admin page using PageBackground + GlassCard + tokens correctly
- `app/admin/professionals/page.tsx` — admin list using GlassCard + Badge + Chip correctly
- `app/admin/professionals/[id]/review/page.tsx` — admin detail using GlassCard + tokens correctly
- `app/gracias/page.tsx` — public page with glass card (reference for confirmation pages)
- `app/p/[slug]/page.tsx` — public profile with inline `liquid-glass` divs (reference for card styling)

**Key component APIs:**
- `PageBackground`: `<PageBackground />` (defaults to public illustration) or `<PageBackground image={ADMIN_BG} />` for admin
- `GlassCard`: wraps content in `liquid-glass rounded-3xl shadow-elevated border border-outline/30` + `p-6` inner div
- `Modal`: `<Modal open={} onClose={} title="" footer={}>` — already uses tokens

**Token mapping (what to replace):**
| Wrong | Correct |
|-------|---------|
| `bg-gray-50` | `bg-background` |
| `bg-white` (cards) | `bg-surface` or `GlassCard` |
| `text-gray-900` | `text-foreground` |
| `text-gray-700` | `text-foreground` |
| `text-gray-500` | `text-muted` |
| `border-gray-300` | `border-outline` |
| `border-gray-200` | `border-outline` |
| `bg-blue-600` | `bg-brand` |
| `hover:bg-blue-700` | `hover:bg-brand/90` |
| `text-blue-600` | `text-brand` |
| `bg-red-50 border-red-200 text-red-700` | `Alert variant="error"` or `bg-danger-weak border-danger/20 text-danger` |
| `disabled:bg-gray-400` | `disabled:opacity-50` |
| `bg-gray-200 text-gray-700` | `bg-surface-2 text-foreground` |
| `divide-gray-200` | `divide-outline` |
| `bg-black bg-opacity-50` | Use `Modal` component |
| `#FBF7F2` (inline style) | `PageBackground` component |
| `border-white/30` (on glass cards) | `border-outline/30` |
| `rounded-md` / `rounded-lg` (inputs/cards) | `rounded-xl` |

**Gotchas:**
- `GlassCard` has a `p-6` inner div — don't add extra padding
- `PageBackground` uses `bg-background` CSS class (resolves to `#FBF7F2`) — no inline `backgroundColor` needed
- Pages using `BackgroundPicker` (registration, recommendations) need `PageBackground` to accept dynamic `image` prop — it already does
- `border-white/30` vs `border-outline/30`: GlassCard uses `outline/30`, public pages use `white/30`. Normalize to `outline/30` for consistency.

**Conventions:**
- Spanish copy: Argentine informal (vos, querés, escribís)
- Error logging: `logError()` from `lib/monitoring.ts`, not `console.error`
- No `any` types — use `unknown` + type narrowing

## Assumptions

- `PageBackground` component supports dynamic `image` prop (verified — it does)
- `GlassCard` component handles the standard glass card pattern (verified — `liquid-glass rounded-3xl shadow-elevated border border-outline/30`)
- `Modal` component is adequate for the PQL adjustment dialog (verified — it has title, children, footer)
- Admin pages that already use `AdminLayout` keep it — we're only changing content within pages, not layout structure
- `MODALITY_MAP` and `STYLE_MAP` values differ slightly between `/p/[slug]` and review page — will need to merge (review page has more entries)

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking E2E tests that assert on `data-testid` attributes | Medium | Medium | Preserve all existing `data-testid` attributes during migration |
| PQL table loses functionality during rewrite | Low | Medium | Keep all existing state management and API calls, only change markup |
| Glass card padding changes break existing layouts | Low | Low | GlassCard uses `p-6` — same as most inline cards already use |
| AdminLayout on PQL/match pages adds nav bar — changes page structure | Low | Medium | Both pages are under `/admin/`, AdminLayout is a client-safe component. Verify nav renders correctly after wrapping. |

## Goal Verification

### Truths

1. Zero Tailwind gray/blue/red classes remain in any page file (except `/ui`)
2. Zero hardcoded `#FBF7F2` remains in any file
3. Zero English copy remains in user-facing admin pages (PQLs, match creation)
4. All pages under `/admin/` use design tokens exclusively
5. All public pages use `PageBackground` component (or equivalent for dynamic backgrounds)
6. Review page is under 440 lines
7. `MODALITY_MAP` and `STYLE_MAP` exist in exactly one location
8. All existing tests pass after migration

### Artifacts

- Modified files: ~13 page/component files
- New file: `app/admin/professionals/[id]/review/components/ScoreDisplay.tsx`
- Modified shared: `lib/design-constants.ts` (add label maps)

## E2E Test Scenarios

### TS-001: PQL Ledger Page — Visual and Functional Verification
**Priority:** High
**Preconditions:** Logged in as admin, PQL entries exist in database
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/pqls` | Page loads with glass card styling, Spanish headers |
| 2 | Verify table uses design tokens | No gray backgrounds, proper `text-foreground`/`text-muted` colors |
| 3 | Click "Ajustar" button on a PQL entry | Modal component opens (not raw div), Spanish labels |
| 4 | Fill amount and reason, submit | Adjustment succeeds, modal closes |

### TS-002: Match Creation Page — Visual and Functional Verification
**Priority:** High
**Preconditions:** Logged in as admin, lead exists, active professionals exist
**Mapped Tasks:** Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/leads/[id]/match` | Page uses AdminLayout with glass nav, glass cards for each rank section |
| 2 | Select 3 professionals and add reasons | Dropdowns and inputs use design tokens |
| 3 | Submit match | Match created successfully, redirects to leads |

### TS-003: Admin Review Page — Profile Image Display
**Priority:** Medium
**Preconditions:** Professional with profile image exists in submitted status
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to review page for professional with image | Avatar shows profile image (circular, 80px) |
| 2 | Navigate to review page for professional without image | Shows initial-letter fallback avatar |

## Progress Tracking

- [x] Task 1: Extract shared label maps + score display components
- [x] Task 2: Admin review page — profile image + cleanup
- [x] Task 3: PQL ledger page — full rewrite
- [x] Task 4: Match creation page — full rewrite
- [x] Task 5: Public pages — PageBackground migration + border normalization
- [x] Task 6: /solicitar page — PageBackground + GlassCard migration

**Total Tasks:** 6 | **Completed:** 6 | **Remaining:** 0

## Implementation Tasks

### Task 1: Extract shared label maps + score display components

**Objective:** Move duplicated `MODALITY_MAP`, `STYLE_MAP`, `STATUS_CONFIG`/`STATUS_BADGE` to `lib/design-constants.ts`. Extract `ScoreRing` and `ScoreBreakdown` from review page into a dedicated component file.

**Dependencies:** None

**Files:**

- Modify: `lib/design-constants.ts` — add `MODALITY_MAP`, `STYLE_MAP`, `STATUS_CONFIG`, `SERVICE_TYPE_MAP`
- Create: `app/admin/professionals/[id]/review/components/ScoreDisplay.tsx` — `ScoreRing` + `ScoreBreakdown`
- Modify: `app/admin/professionals/[id]/review/page.tsx` — import from shared locations, remove inline definitions
- Modify: `app/admin/professionals/page.tsx` — import `STATUS_CONFIG` from shared
- Modify: `app/p/[slug]/page.tsx` — import `MODALITY_MAP`, `STYLE_MAP`, `SERVICE_TYPE_MAP` from shared

**Key Decisions / Notes:**

- Merge the two `MODALITY_MAP` variants (review page has more entries: `presencial`, `ambos`). Keep all entries from both.
- Merge the two `STYLE_MAP` variants similarly.
- `STATUS_BADGE` (professionals list) and `STATUS_CONFIG` (review page) are identical structure — unify as `STATUS_CONFIG`.
- `ScoreDisplay.tsx` exports `ScoreRing` and `ScoreBreakdown` — both are pure presentation components with no state.
- `SCORE_THRESHOLDS` moves into `ScoreDisplay.tsx` since it's only used there.

**Definition of Done:**

- [ ] `MODALITY_MAP`, `STYLE_MAP`, `STATUS_CONFIG`, `SERVICE_TYPE_MAP` exist only in `lib/design-constants.ts`
- [ ] `ScoreRing` and `ScoreBreakdown` live in `ScoreDisplay.tsx`
- [ ] Review page is under 440 lines
- [ ] All tests pass
- [ ] No diagnostics errors

**Verify:**

- `npx tsc --noEmit`
- `npm run test:unit`

---

### Task 2: Admin review page — profile image + border cleanup

**Objective:** Show profile image avatar in the review page header card (with initial-letter fallback). Normalize glass card borders.

**Dependencies:** Task 1

**Files:**

- Modify: `app/admin/professionals/[id]/review/page.tsx`

**Key Decisions / Notes:**

- Avatar pattern: copy from `app/p/[slug]/page.tsx:161-175` (circular, 80px, gradient fallback with initial letter)
- Place avatar in the header `GlassCard`, left of the name — same layout as public profile
- Review page already uses `GlassCard` (which uses `border-outline/30`) — no border normalization needed here

**Definition of Done:**

- [ ] Profile image displays when `profile_image_url` is present
- [ ] Initial-letter fallback displays when no image
- [ ] Avatar is circular, consistent with `/p/[slug]` styling
- [ ] All tests pass

**Verify:**

- `npx tsc --noEmit`
- Visual check: review page for professional with and without image

---

### Task 3: PQL ledger page — full design system rewrite

**Objective:** Rewrite PQL page from raw Tailwind grays to design system. Use AdminLayout, GlassCard, Modal, Badge, Button, design tokens. Translate to Spanish.

**Dependencies:** None (parallel with Tasks 1-2)

**Files:**

- Modify: `app/admin/pqls/page.tsx`

**Key Decisions / Notes:**

- Wrap entire page in `AdminLayout` (it's under `/admin/` — should have the admin nav)
- Replace raw `<table>` with glass-card-based table (use `GlassCard` wrapper, token-styled `<table>` inside, or card-per-row for mobile)
- Replace hand-rolled modal (`fixed inset-0 bg-black bg-opacity-50`) with `Modal` component
- Replace `alert()` calls with proper `Alert` component state
- Replace `bg-blue-600` buttons with `Button` component
- Fix `catch (err: any)` → `catch (err: unknown)` with proper narrowing
- Replace `console.error` with `logError` from `lib/monitoring.ts`
- All copy to Spanish (exhaustive list):
  - "Loading..." → "Cargando..."
  - "PQL Ledger" → "Registro PQL"
  - "Professional" → "Profesional"
  - "Month" → "Mes"
  - "Balance" → "Saldo"
  - "Actions" → "Acciones"
  - "Adjust" → "Ajustar"
  - "Adjust PQL Balance" → "Ajustar saldo PQL"
  - "Amount" → "Monto"
  - "Reason" → "Motivo"
  - "Submit" → "Confirmar"
  - "Cancel" → "Cancelar"
  - "Please provide a reason" → validation state (not alert)
  - "Adjustment successful" → Alert component success state
  - "Failed to fetch PQLs" (thrown Error, line 35) → "Error al cargar el registro PQL"
  - "Failed to adjust" (thrown Error, line 63) → "Error al ajustar el saldo"
  - `console.error('Failed to load PQL entries:', err)` → `logError(...)` with Spanish context
- Two catch blocks in this file: `catch (err: any)` in handleAdjust (needs `unknown` + narrowing) and `catch (err)` in fetchEntries (already correct type, but `console.error` needs `logError` replacement and error message needs Spanish)
- Preserve all `data-testid` attributes

**Definition of Done:**

- [ ] Zero gray/blue/red Tailwind classes in file
- [ ] Uses AdminLayout, GlassCard, Modal, Button, Alert, Badge
- [ ] All copy in Spanish
- [ ] No `any` types
- [ ] No `console.error` — uses `logError`
- [ ] All existing functionality preserved (fetch, adjust, modal flow)
- [ ] All `data-testid` attributes preserved
- [ ] All tests pass

**Verify:**

- `npx tsc --noEmit`
- `npm run test:unit`

---

### Task 4: Match creation page — full design system rewrite

**Objective:** Rewrite match creation page from raw Tailwind grays to design system. Use AdminLayout, GlassCard, Button, Alert, design tokens. Translate to Spanish.

**Dependencies:** None (parallel with Tasks 1-3)

**Files:**

- Modify: `app/admin/leads/[id]/match/page.tsx`

**Key Decisions / Notes:**

- Wrap in `AdminLayout`
- Replace `bg-white p-6 rounded-lg shadow` rank sections with `GlassCard`
- Replace `bg-blue-600` submit button with `Button variant="primary"`
- Replace `bg-red-50 border-red-200 text-red-700` error div with `Alert variant="error"`
- Replace `alert()` success with `Alert` state or router redirect (currently does both — alert then redirect)
- Replace `bg-gray-300 rounded-md` inputs with token-styled inputs (`bg-surface border-outline rounded-xl`)
- Two catch blocks: `catch (err: any)` in handleSubmit (line 114 — needs `unknown` + narrowing) and `catch (err)` in fetchProfessionals (line 47 — already correct type, but error string needs Spanish)
- All copy to Spanish (exhaustive):
  - "Loading..." → "Cargando..."
  - "Create Match for Lead {id}" → "Crear match para solicitud {id}"
  - "Rank N" → "Posición N"
  - "Select Professional" / "-- Select Professional --" → "Seleccionar profesional" / "-- Seleccionar profesional --"
  - "Reasons (at least 1 required)" → "Razones de recomendación (al menos 1)"
  - "Reason N" (placeholder) → "Razón N"
  - "Please select 3 professionals" → "Seleccioná 3 profesionales"
  - "Please select 3 DISTINCT professionals" → "Los 3 profesionales deben ser distintos"
  - "Please provide at least one reason for each professional" → "Agregá al menos una razón para cada profesional"
  - "Creating Match..." / "Create Match" → "Creando match..." / "Crear match"
  - "Match created! Tracking code: ..." (alert) → replace with Alert success, "Match creado. Código: ..."
  - "Failed to fetch professionals" / "Failed to load professionals" → "Error al cargar profesionales"
  - "Failed to create match" → "Error al crear el match"
- Replace `Loading...` div with proper centered loading state using design tokens
- Preserve all `data-testid` attributes

**Definition of Done:**

- [ ] Zero gray/blue/red Tailwind classes in file
- [ ] Uses AdminLayout, GlassCard, Button, Alert
- [ ] All copy in Spanish (Argentine informal)
- [ ] No `any` types
- [ ] All existing functionality preserved (fetch professionals, select, submit)
- [ ] All `data-testid` attributes preserved
- [ ] All tests pass

**Verify:**

- `npx tsc --noEmit`
- `npm run test:unit`

---

### Task 5: Public pages — PageBackground migration + border normalization

**Objective:** Replace all hardcoded inline background styles (`#FBF7F2`, inline `backgroundImage`) with `PageBackground` component. Normalize `border-white/30` to `border-outline/30` on glass cards.

**Dependencies:** None (parallel with all other tasks)

**Files:**

- Modify: `app/gracias/page.tsx` — replace inline background div with `<PageBackground />`
- Modify: `app/profesionales/registro/confirmacion/page.tsx` — same
- Modify: `app/p/[slug]/page.tsx` — replace inline background div with `<PageBackground />`, normalize borders
- Modify: `app/r/[tracking_code]/page.tsx` — replace inline background div with `<PageBackground image={backgroundPath} />` (dynamic)
- Modify: `app/r/[tracking_code]/components/CardSkeleton.tsx` — replace inline `#FBF7F2` with `<PageBackground />`
- Modify: `app/profesionales/registro/page.tsx` — replace inline background div with `<PageBackground image={backgroundPath} />` (dynamic)
- Modify: `app/r/[tracking_code]/components/BottomSheet.tsx` — normalize `border-white/30` to `border-outline/30` on sheet container

**Key Decisions / Notes:**

- `PageBackground` already defaults to the public illustration and uses `bg-background` (no hardcoded hex)
- For pages with `BackgroundPicker` (registration, recommendations): pass `image={backgroundPath}` to `PageBackground`
- For `CardSkeleton.tsx`: replace the inline-style background div with `<PageBackground />` to get both background color AND illustration (matching the loaded page appearance). Remove the redundant `bg-background` on the outer div since PageBackground handles it.
- Border normalization: `border-white/30` → `border-outline/30` on all inline `liquid-glass` divs AND `BottomSheet.tsx` to match `GlassCard`
- Do NOT convert inline `liquid-glass` divs to `GlassCard` on public pages — some have custom padding, layout, or className needs that don't fit GlassCard's fixed `p-6` inner div

**Definition of Done:**

- [ ] Zero hardcoded `#FBF7F2` in any `.tsx` file (except `/ui`)
- [ ] All public pages use `PageBackground` component
- [ ] All `border-white/30` on glass cards normalized to `border-outline/30`
- [ ] All tests pass
- [ ] No visual regressions (pages render same as before)

**Verify:**

- `npx tsc --noEmit`
- `grep -r "FBF7F2" app/ --include="*.tsx"` returns only `app/ui/page.tsx` (if any)

---

### Task 6: /solicitar page — PageBackground + GlassCard migration

**Objective:** Migrate /solicitar to use `PageBackground` component and `GlassCard` where appropriate. Normalize borders.

**Dependencies:** Task 5 (PageBackground pattern established)

**Files:**

- Modify: `app/solicitar/page.tsx`

**Key Decisions / Notes:**

- Replace inline background div with `<PageBackground />`
- The page uses 5 inline `liquid-glass` card sections, each with `border-white/30` → normalize to `border-outline/30`
- Do NOT convert to `GlassCard` component — these cards have custom padding (`p-6 mb-4`) that doesn't match GlassCard's fixed structure, and the form layout needs the flexibility
- Replace submit error div (`bg-danger-weak border border-danger/20 rounded-xl`) with `Alert variant="error"` component for consistency
- Keep `INPUT_CLASS`, `LABEL_CLASS` etc. constants — they use correct tokens already

**Definition of Done:**

- [ ] Uses `PageBackground` component (no inline background)
- [ ] All borders normalized to `border-outline/30`
- [ ] Error state uses `Alert` component
- [ ] All tests pass
- [ ] Form functionality unchanged

**Verify:**

- `npx tsc --noEmit`
- `npm run test:unit`

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | High | PARTIAL | 0 | Admin login page renders correctly in Spanish. Full PQL table/modal flow not tested — requires E2E_ADMIN_EMAIL/PASSWORD env vars |
| TS-002 | High | PARTIAL | 0 | Admin login page verified. Full match creation flow not tested — requires admin auth |
| TS-003 | Medium | PARTIAL | 0 | Admin login page verified. Profile image display not tested — requires admin auth + seeded data |
| Public pages | N/A | PASS | 0 | /solicitar, /gracias, /profesionales/registro/confirmacion, /profesionales/registro all render correctly with Spanish copy |

## Open Questions

None — all decisions resolved.

### Deferred Ideas

- Registration form refactor (807 lines) — separate task
- `/solicitar` page at 454 lines — slightly over 440-line limit. PageBackground + Alert migration won't change line count. Form option constants (~50 lines) could move to shared file in a future pass.
- Convert inline `liquid-glass` divs on public pages to `GlassCard` — requires GlassCard to support custom padding/className on inner div first
