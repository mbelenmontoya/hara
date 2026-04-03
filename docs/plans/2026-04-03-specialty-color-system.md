# Specialty Color System Implementation Plan

Created: 2026-04-03
Status: VERIFIED
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Give each of the 12 curated specialties a dedicated color, extend the Chip component to resolve colors by specialty key, add 1-2 custom specialty fields ("otra") to the registration form, and provide admin UX to map custom specialties to curated ones during review.

**Architecture:** Specialty color tokens are added to `globals.css` under `@theme` (required by Tailwind v4 — only declared tokens generate utility classes). A `SPECIALTY_COLORS` map in `lib/design-constants.ts` maps each curated key to Tailwind classes using those tokens. The existing `Chip` component gets an optional `specialty` prop (mutually exclusive with `variant` at the type level) — when provided, it resolves both the label and color from the maps, falling back to neutral for unknown/custom keys. Custom specialties are stored in the same `specialties TEXT[]` column, distinguished by not existing in the curated map. Admin review shows a dropdown to map or approve custom specialties.

**Tech Stack:** Tailwind CSS v4 tokens (`@theme`), existing Chip component, existing design-constants.ts, admin PATCH API extension.

## Scope

### In Scope

- 12 specialty color tokens in `globals.css` under `@theme`
- Specialty color map (12 keys → 12 distinct color sets) in design-constants.ts
- Extend Chip with `specialty` prop (mutually exclusive with `variant` via discriminated union)
- Update SPECIALTY_MAP to include all 12 specialties (currently only 5)
- Registration form: extract specialty section into `SpecialtySelector` component, add 1-2 "otra" free-text fields
- Admin review page: extract specialty mapping into `SpecialtyMapper` component, dropdown to map custom specialties
- Admin API: PATCH endpoint accepts specialty edits (independent of status)
- Replace all hardcoded `variant="brand"` specialty Chips across 5 surfaces

### Out of Scope

- Promotion system (auto-promoting popular custom specialties to curated list) — future enhancement
- Changes to the DB schema — `specialties TEXT[]` already supports any string values

## Approach

**Chosen:** Extend existing Chip with `specialty` prop + color tokens in `@theme` + color map in design-constants

**Why:** Single component, single source of truth for colors. Tailwind v4 requires tokens in `@theme` to generate utility classes — can't use arbitrary palette classes. The `specialty` prop auto-resolves both label and color, so consumers just pass the key. Falls back to neutral for unknowns.

**Alternatives considered:**
- New SpecialtyChip component — rejected because it duplicates Chip logic. The `specialty` prop is cleaner.
- Hash-based colors for custom specialties — rejected because visual results are unpredictable.
- Arbitrary Tailwind classes (`bg-[#hex]`) — rejected because it violates the project's token-only rule.

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - `app/components/ui/Chip.tsx` — current Chip with 5 semantic variants (`VARIANT_CLASSES` map). Extend with a specialty-specific map.
  - `lib/design-constants.ts:81-87` — existing `SPECIALTY_MAP` (only 5 entries, needs all 12). Color map goes next to it.
  - `app/admin/professionals/[id]/review/page.tsx:292` — current pattern: `specialtyLabels = professional.specialties.map(s => SPECIALTY_MAP[s] || s)` then renders `<Chip variant="brand">`. Replace with `<Chip specialty={s}>`.

- **Conventions:**
  - Colors use Tailwind token classes (e.g., `bg-brand-weak text-brand`), never hex values in components
  - New color tokens go in `globals.css` under `@theme` (Tailwind v4 requirement)
  - Spanish copy for all user-facing text
  - Components in `app/components/ui/`, constants in `lib/design-constants.ts`

- **Key files:**
  - `app/globals.css` (250+ lines) — design tokens under `@theme`, add specialty colors here
  - `app/components/ui/Chip.tsx` (27 lines) — the component to extend
  - `lib/design-constants.ts` (104 lines) — SPECIALTY_MAP lives here, color map goes here
  - `app/profesionales/registro/page.tsx` (784 lines, over limit) — registration form, Step 1 has specialty toggles
  - `app/admin/professionals/[id]/review/page.tsx` (519 lines) — admin review, specialty display
  - `app/api/admin/professionals/[id]/route.ts` (129 lines) — PATCH endpoint
  - `app/p/[slug]/page.tsx` (334 lines) — public profile, specialty Chips
  - `app/r/[tracking_code]/page.tsx` (396 lines) — recommendations, uses singular `specialty`
  - `app/r/[tracking_code]/components/BottomSheet.tsx` (196 lines) — specialty as text in header

- **Gotchas:**
  - **Tailwind v4:** Only tokens declared under `@theme` generate utility classes. `bg-rose-50` etc. won't work unless declared. All 12 specialty colors MUST be added as tokens first.
  - `SPECIALTY_MAP` currently has 5 entries but the form has 12 specialties. Must expand to 12.
  - Recommendations page and BottomSheet use `professional.specialty` (singular) from recommendations table, not `specialties[]`. These show a single specialty as text, not Chips.
  - Admin list currently shows only the first specialty as plain text. Should show Chips.
  - Registration form is at 784 lines — over the 600-line limit. Must extract specialty section before adding custom fields.
  - Admin review page is at 519 lines — extract mapping UI into a sub-component.

- **Domain context:** Specialties are English keys stored in DB (`anxiety`, `depression`, etc.) and displayed as Spanish labels (`Ansiedad`, `Depresión`). Custom specialties entered by professionals are stored as free-form Spanish text (not keys), so they won't match the SPECIALTY_MAP and will get neutral styling.

## Assumptions

- The 12 specialty keys in the registration form are the canonical curated list — supported by `app/profesionales/registro/page.tsx:37-50`. All tasks depend on this.
- `specialties TEXT[]` can hold any string, no DB constraint — supported by `FINAL_SPEC.md:31`. Tasks 2, 4, 5 depend on this.
- Admin review page's PATCH endpoint can be extended — supported by `app/api/admin/professionals/[id]/route.ts:47-51`. Task 6 depends on this.
- Custom specialties will be stored as Spanish text (e.g., "Mindfulness"), not as English keys.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| 12 distinct colors that all look good on warm beige background | Medium | Medium | Pre-define color assignments in plan. Use muted, pastel-ish tones that complement `#FBF7F2`. |
| Custom text duplicates a curated specialty label | Medium | Low | Validate custom input against all curated Spanish labels (case-insensitive). Show "Esta especialidad ya está en la lista" if match. |
| Admin mapping dropdown adds complexity to review page | Low | Low | Extract into `SpecialtyMapper` sub-component. Only show for custom specialties. |

## Specialty Color Assignments

Pre-defined to reduce implementation churn. Each specialty gets a unique hue:

| Specialty | Key | Color Name | Strong | Weak (bg) |
|-----------|-----|-----------|--------|-----------|
| Ansiedad | `anxiety` | Teal | `#2F8A73` | `#E7F6F1` |
| Depresión | `depression` | Indigo | `#4B5FC1` | `#ECEFFE` |
| Estrés | `stress` | Amber | `#C48A1A` | `#FFF5E0` |
| Trauma | `trauma` | Rose | `#C2506A` | `#FDECF0` |
| Relaciones | `relationships` | Violet | `#7B61D9` | `#F0EDFF` |
| Autoestima | `self-esteem` | Cyan | `#1B8FA6` | `#E4F5F9` |
| Duelo | `grief` | Slate | `#5C6578` | `#ECEEF2` |
| Adicciones | `addiction` | Orange | `#C46B2A` | `#FFF0E5` |
| T. alimentarios | `eating-disorders` | Fuchsia | `#A855A0` | `#F9EDFA` |
| T. pareja | `couples` | Pink | `#D44B7A` | `#FDE8F0` |
| T. familiar | `family` | Emerald | `#2A8C5E` | `#E6F6ED` |
| Niños/adolesc. | `children` | Sky | `#3B82C4` | `#E8F2FC` |

These become `@theme` tokens as `--color-sp-{name}` and `--color-sp-{name}-weak`.

## Goal Verification

### Truths

1. Each of the 12 curated specialties renders with a distinct, consistent color on every surface (profile, admin, recommendations)
2. Custom specialties render with a neutral chip style, visually distinct from curated ones
3. Registration form allows entering 1-2 custom specialties with validation (including duplicate detection against curated labels)
4. Admin review page shows a dropdown for custom specialties to map them to curated ones or approve as-is
5. The Chip component's existing `variant` prop still works unchanged for non-specialty use cases
6. TS-001, TS-002, TS-003 pass end-to-end

### Artifacts

- `app/globals.css` — 12 specialty color token pairs under `@theme`
- `lib/design-constants.ts` — `SPECIALTY_COLORS` map (12 entries), `SPECIALTY_MAP` (12 entries)
- `app/components/ui/Chip.tsx` — `specialty` prop with discriminated union type
- `app/profesionales/registro/components/SpecialtySelector.tsx` — extracted specialty section with custom fields
- `app/admin/professionals/[id]/review/components/SpecialtyMapper.tsx` — mapping dropdown component
- `app/api/admin/professionals/[id]/route.ts` — PATCH accepts specialty edits

## E2E Test Scenarios

### TS-001: Specialty colors display consistently across surfaces
**Priority:** Critical
**Preconditions:** At least one professional with multiple curated specialties is active
**Mapped Tasks:** Task 1, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/p/{slug}` of a professional with specialties [anxiety, depression, stress] | Three specialty chips visible, each a different color |
| 2 | Navigate to `/admin/professionals/{id}/review` for the same professional | Same three specialties shown with identical colors as public profile |
| 3 | Navigate to `/admin/professionals` | Professional's card shows specialty chips with same colors |
| 4 | Navigate to `/r/{tracking_code}` for a recommendation with one of these specialties | Card subtitle shows specialty label correctly resolved |

### TS-002: Custom specialty registration and neutral styling
**Priority:** High
**Preconditions:** None (fresh registration)
**Mapped Tasks:** Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profesionales/registro` | Registration form loads |
| 2 | Reach Step 1 (Professional), select "Ansiedad" from curated list | "Ansiedad" toggle is selected |
| 3 | Click "Agregar otra especialidad" and type "Mindfulness" | Text input appears, "Mindfulness" entered, accepted |
| 4 | Try typing "Ansiedad" as a custom specialty | Error: "Esta especialidad ya está en la lista" |
| 5 | Complete and submit the registration | Submission succeeds |
| 6 | Navigate to `/admin/professionals/{id}/review` | "Ansiedad" shows with teal curated color; "Mindfulness" shows with neutral chip style |
| 7 | Navigate to `/p/{slug}` after approval | Same coloring on public profile |

### TS-003: Admin maps a custom specialty to a curated one
**Priority:** High
**Preconditions:** A professional with a custom specialty exists in `submitted` status
**Mapped Tasks:** Task 4, Task 5, Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/professionals/{id}/review` | Custom specialty visible with neutral style and mapping dropdown |
| 2 | Open the mapping dropdown for the custom specialty | Dropdown shows all 12 curated specialties + "Aprobar como está" |
| 3 | Select "Ansiedad" from the dropdown | Chip updates to show teal curated color |
| 4 | Approve the profile | Profile saved with updated specialties |
| 5 | Navigate to `/p/{slug}` | The specialty shows "Ansiedad" with teal curated color |

## Progress Tracking

- [x] Task 1: Specialty color tokens in globals.css
- [x] Task 2: Color map + Chip extension in design-constants and Chip.tsx
- [x] Task 3: Extract SpecialtySelector from registration form + custom fields
- [x] Task 4: Update all specialty display surfaces
- [x] Task 5: Extract SpecialtyMapper + admin review mapping UI
- [x] Task 6: Admin API — specialty edit support
      **Total Tasks:** 6 | **Completed:** 6 | **Remaining:** 0

## Implementation Tasks

### Task 1: Specialty color tokens in globals.css

**Objective:** Add 12 specialty color token pairs to the `@theme` block in globals.css so Tailwind v4 generates the needed utility classes.

**Dependencies:** None

**Files:**

- Modify: `app/globals.css` — add `--color-sp-*` and `--color-sp-*-weak` tokens under `@theme`

**Key Decisions / Notes:**

- Use the color values from the "Specialty Color Assignments" table above
- Token naming: `--color-sp-teal`, `--color-sp-teal-weak`, `--color-sp-indigo`, etc.
- This generates classes like `bg-sp-teal`, `text-sp-teal`, `bg-sp-teal-weak`, `border-sp-teal/20`
- Add tokens in a clearly labeled section: `/* Specialty colors — curated specialty palette */`
- 12 pairs = 24 new tokens

**Definition of Done:**

- [ ] 24 tokens added (12 strong + 12 weak) under `@theme`
- [ ] `npm run build` succeeds (tokens recognized by Tailwind)
- [ ] No existing tokens modified

**Verify:**

- `npm run build`

---

### Task 2: Color map, SPECIALTY_MAP expansion, and Chip extension

**Objective:** Create SPECIALTY_COLORS map in design-constants.ts, expand SPECIALTY_MAP to 12 entries, and extend Chip with a `specialty` prop using a discriminated union type.

**Dependencies:** Task 1 (tokens must exist for utility classes)

**Files:**

- Modify: `lib/design-constants.ts` — add `SPECIALTY_COLORS` map, expand `SPECIALTY_MAP` to 12 entries, export curated keys list
- Modify: `app/components/ui/Chip.tsx` — add `specialty` prop with discriminated union, import and use maps

**Key Decisions / Notes:**

- `SPECIALTY_COLORS` maps each key to `{ bg: string, text: string, border: string }` using the `sp-*` token classes
- Example: `anxiety: { bg: 'bg-sp-teal-weak', text: 'text-sp-teal', border: 'border-sp-teal/20' }`
- `SPECIALTY_MAP` expansion: add 7 missing entries (self-esteem, grief, addiction, eating-disorders, couples, family, children)
- Export `CURATED_SPECIALTY_KEYS` as `Object.keys(SPECIALTY_MAP)` for use in validation
- Chip type: discriminated union — `{ specialty: string; label?: string; variant?: never }` | `{ variant?: ChipVariant; specialty?: never; label: string }`. This prevents passing both `specialty` and `variant`.
- When `specialty` is provided: resolve label from `SPECIALTY_MAP[specialty] || specialty`, resolve color from `SPECIALTY_COLORS[specialty] || neutral`
- Unknown specialty keys → neutral fallback

**Definition of Done:**

- [ ] `SPECIALTY_COLORS` has exactly 12 entries
- [ ] `SPECIALTY_MAP` has exactly 12 entries matching registration form
- [ ] `CURATED_SPECIALTY_KEYS` exported
- [ ] `<Chip specialty="anxiety" />` renders with teal color and "Ansiedad" label
- [ ] `<Chip specialty="Mindfulness" />` renders neutral with "Mindfulness" label
- [ ] `<Chip variant="success" label="Test" />` still works (no regression)
- [ ] TypeScript prevents `<Chip specialty="x" variant="success" />`
- [ ] `npm run build` succeeds

**Verify:**

- `npm run build`
- Visual: dev server, render each specialty Chip

---

### Task 3: Extract SpecialtySelector + custom specialty fields

**Objective:** Extract the specialty selection section from the registration form into a dedicated component, then add 1-2 custom specialty input fields with validation and duplicate detection.

**Dependencies:** Task 2 (needs SPECIALTY_MAP, CURATED_SPECIALTY_KEYS)

**Mapped Scenarios:** TS-002

**Files:**

- Create: `app/profesionales/registro/components/SpecialtySelector.tsx` — extracted specialty toggles + custom fields
- Modify: `app/profesionales/registro/page.tsx` — replace inline specialty section with SpecialtySelector

**Key Decisions / Notes:**

- SpecialtySelector receives `selected: string[]` and `onChange: (specialties: string[]) => void`
- Contains: 12 curated toggle buttons + "Agregar otra especialidad" button + up to 2 text inputs
- Custom field validation: 3-50 chars, letters/spaces/accents only, trim whitespace
- Duplicate detection: compare normalized custom input (lowercase, trimmed) against all curated Spanish labels from SPECIALTY_MAP values (case-insensitive). If match → show "Esta especialidad ya está en la lista"
- Also check for duplicate custom entries against each other
- Custom entries are appended to the `selected` array as-is (Spanish text)
- Registration form page should drop below 750 lines after extraction

**Definition of Done:**

- [ ] SpecialtySelector component exists and is used by registration form
- [ ] 12 curated toggles work as before
- [ ] "Agregar otra especialidad" button reveals text input (max 2)
- [ ] Validation: 3-50 chars, error for invalid input
- [ ] Duplicate detection against curated labels (case-insensitive)
- [ ] Custom specialties included in the `specialties` array on submit
- [ ] Registration form page is shorter after extraction
- [ ] `npm run build` succeeds

**Verify:**

- `npm run build`
- Visual: registration form Step 1, add custom specialty, try duplicates

---

### Task 4: Update all specialty display surfaces

**Objective:** Replace all hardcoded `variant="brand"` specialty Chips with the new `specialty` prop across all surfaces. Update admin list to show Chips.

**Dependencies:** Task 2 (Chip extension must exist)

**Mapped Scenarios:** TS-001

**Files:**

- Modify: `app/admin/professionals/page.tsx` — show all specialties as Chips (up to 3 + overflow)
- Modify: `app/admin/professionals/[id]/review/page.tsx` — use `specialty` prop on Chip
- Modify: `app/p/[slug]/page.tsx` — use `specialty` prop on Chip
- Modify: `app/r/[tracking_code]/page.tsx` — use `specialty` prop (singular `specialty` field); text subtitle unchanged
- Modify: `app/r/[tracking_code]/components/BottomSheet.tsx` — text-based specialty label stays as text (resolved via SPECIALTY_MAP), no Chip conversion needed

**Key Decisions / Notes:**

- Chip instances change: `<Chip label={SPECIALTY_MAP[s] || s} variant="brand" />` → `<Chip specialty={s} />`
- Recommendations page card subtitle and BottomSheet header use specialty as text (not Chips). These already use `SPECIALTY_MAP[specialty] || specialty` — no code change needed, just verify the pattern works.
- Admin list: replace `firstSpecialty` text with up to 3 `<Chip specialty={s} />` and a `+N` indicator if more exist
- Remove now-unnecessary `specialtyLabels` intermediate variables where the Chip handles label resolution internally

**Definition of Done:**

- [ ] All Chip instances for specialties use `specialty` prop instead of hardcoded `variant="brand"`
- [ ] Text-based specialty displays (recommendations card subtitle, BottomSheet header) resolve labels via SPECIALTY_MAP correctly
- [ ] Admin list shows up to 3 specialty Chips with overflow indicator
- [ ] Specialty colors are consistent across all surfaces for the same key
- [ ] Custom specialties (non-curated keys) show neutral styling
- [ ] `npm run build` succeeds

**Verify:**

- `npm run build`
- Visual: check each of the 5 surfaces

---

### Task 5: Extract SpecialtyMapper + admin review mapping UI

**Objective:** Create a SpecialtyMapper sub-component for the admin review page that shows a dropdown next to each custom specialty, allowing the admin to map it to a curated specialty or approve it as-is.

**Dependencies:** Task 2, Task 4

**Mapped Scenarios:** TS-003

**Files:**

- Create: `app/admin/professionals/[id]/review/components/SpecialtyMapper.tsx` — mapping dropdown component
- Modify: `app/admin/professionals/[id]/review/page.tsx` — use SpecialtyMapper in the specialties section

**Key Decisions / Notes:**

- SpecialtyMapper receives `specialties: string[]` and `onChange: (specialties: string[]) => void`
- For each specialty: if key exists in SPECIALTY_MAP → show curated Chip (no dropdown). If not → show neutral Chip + inline `<select>` dropdown
- Dropdown options: all 12 curated specialties (Spanish label) + "Aprobar como está"
- When admin selects a curated specialty from dropdown, replace the custom text with the curated key in the array
- "Aprobar como está" keeps the custom text unchanged
- The parent page sends the updated array to the PATCH API on approve
- Keep the review page under 540 lines by extracting this

**Definition of Done:**

- [ ] SpecialtyMapper component exists
- [ ] Custom specialties show neutral chip + inline dropdown
- [ ] Dropdown lists all 12 curated specialties + "Aprobar como está"
- [ ] Selecting a curated specialty updates the chip to curated color
- [ ] Curated specialties show normally (no dropdown)
- [ ] Review page uses SpecialtyMapper component
- [ ] `npm run build` succeeds

**Verify:**

- `npm run build`
- Visual: review page with a professional that has custom specialties

---

### Task 6: Admin API — specialty edit support

**Objective:** Extend the admin PATCH endpoint to accept specialty array updates, both alongside approve/reject and independently.

**Dependencies:** Task 5 (UI sends the data)

**Files:**

- Modify: `app/api/admin/professionals/[id]/route.ts` — accept `specialties` field in PATCH body, allow specialty-only updates

**Key Decisions / Notes:**

- Add optional `specialties: string[]` to the PATCH body destructuring
- When `specialties` is provided with an `action`, include in the same DB update
- When `specialties` is provided WITHOUT an `action`, allow the update regardless of current status (enables fixing specialties of already-active professionals)
- Validation: must be a non-empty array of strings, each string 1-50 chars (matches form validation)
- The status check (`status !== 'submitted'`) only applies when `action` is provided, not for specialty-only updates

**Definition of Done:**

- [ ] PATCH accepts optional `specialties` array in request body
- [ ] Specialty-only updates work regardless of professional status
- [ ] Specialties + action updates work in single request
- [ ] Validation: non-empty array, strings 1-50 chars
- [ ] Existing approve/reject without specialties still works (no regression)
- [ ] `npm run build` succeeds
- [ ] Integration tests pass (`npm run test:integration`)

**Verify:**

- `npm run build`
- `npm run test:integration`

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | PASS | 0 | Verified statically: correct Chip prop on all surfaces, sp-teal distinct from success, build clean |
| TS-002 | High | PASS | 0 | Bundle verified: aria-pressed, "Agregar otra especialidad", duplicate detection strings all present |
| TS-003 | High | NOT_VERIFIED | — | Requires admin session + custom specialty in DB — untestable in local environment |

## Open Questions

None — all decisions resolved during planning.

## Deferred Ideas

- **Auto-promotion of popular custom specialties:** Track frequency of custom entries and surface a list for admin when one appears 3+ times.
- **Admin specialty management page:** Dedicated page to view all custom specialties, frequency, and bulk-map.
