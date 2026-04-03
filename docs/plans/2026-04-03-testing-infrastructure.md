# Testing Infrastructure Implementation Plan

Created: 2026-04-03
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Set up 3-level testing: component tests (Vitest + React Testing Library, colocated), E2E flow tests (Playwright), and visual regression (Playwright screenshots). Cover the specialty system, core UI components, registration flow, and key pages.

**Architecture:** Component tests use Vitest with `jsdom` environment via a separate project config, colocated next to each component. E2E tests use the existing Playwright setup (already configured with `__tests__/e2e/`). Visual regression uses Playwright's built-in `toHaveScreenshot()` with pixel comparison. Admin E2E tests use Supabase `storageState` for auth persistence.

**Tech Stack:** Vitest (existing) + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom`, Playwright (existing, `@playwright/test` installed)

## Scope

### In Scope

- Install `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- Vitest workspace config: separate projects for unit (jsdom) and integration (node)
- Component test setup file for jsdom + jest-dom matchers
- Component tests for 8 components: Chip, SpecialtySelector, SpecialtyMapper, Button, Badge, GlassCard, Modal, Alert
- Playwright global setup: admin login → storageState
- Fix `.gitignore` to allow visual regression baselines while keeping test artifacts ignored
- E2E tests: registration form flow, public profile display
- Visual regression: 4 page screenshots (home, registration step 1, profile, admin login)
- npm scripts: `test:unit`, `test:e2e`, `test:visual`

### Out of Scope

- E2E tests for admin review flow (complex, depends on DB state — deferred to next phase)
- E2E tests for recommendations page (requires match seeding — deferred)
- CI/CD integration (GitHub Actions config — separate task)
- Coverage threshold enforcement (configure after baseline is established)
- Tests for Input, Table, EmptyState, Card, SectionHeader, PageBackground (lower priority, add incrementally)

## Approach

**Chosen:** Vitest workspace + colocated component tests + Playwright E2E + screenshot comparison

**Why:** Leverages both tools already in the project. Vitest workspace cleanly separates jsdom (component) from node (integration) environments without config conflicts. Colocated tests are the React community standard and make it easy to find tests. Playwright's built-in `toHaveScreenshot()` provides visual regression without external services.

**Alternatives considered:**
- Separate Vitest config files (vitest.unit.config.ts, vitest.integration.config.ts) — rejected because workspace is the official Vitest solution for multi-environment projects.
- Storybook + Chromatic for visual regression — rejected because it adds significant setup overhead and a third-party dependency. Playwright screenshots are free and sufficient for our scale.

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - `__tests__/integration/admin-matching.test.ts` — existing integration test pattern (node environment, real HTTP requests to dev server)
  - `__tests__/e2e/ui-smoke.spec.ts` — existing Playwright test pattern (page.goto, expect assertions)
  - `app/components/ui/Chip.tsx` — Chip has a discriminated union type (`specialty` vs `variant` props), important for testing both paths

- **Conventions:**
  - Component tests: `ComponentName.test.tsx` colocated next to the component file
  - E2E tests: `__tests__/e2e/*.spec.ts` (existing convention)
  - Visual tests: `__tests__/e2e/visual/*.spec.ts`
  - npm scripts: `test:unit` (component), `test:integration` (API), `test:e2e` (Playwright flows), `test:visual` (screenshot comparison)

- **Key files:**
  - `vitest.config.ts` (19 lines) — current config, will become `vitest.workspace.ts`
  - `playwright.config.ts` (41 lines) — existing Playwright config with `/api/health` webServer check
  - `package.json` — scripts and dependencies
  - `__tests__/setup/global-setup.ts` (88 lines) — integration test global setup (starts dev server)
  - `__tests__/e2e/` — 4 existing E2E test files (admin auth gating, UI smoke, admin match flow, public contact)

- **Gotchas:**
  - **`/api/health` already exists:** `app/api/health/route.ts` returns `200 OK`. No need to create it — Playwright webServer check works.
  - **Vitest environment conflict:** Current config uses `environment: 'node'`. Component tests need `jsdom`. Workspace config separates these.
  - **`SKIP_ENV_VALIDATION`:** Both workspace projects MUST include `env: { SKIP_ENV_VALIDATION: 'true' }` — currently set in vitest.config.ts globally.
  - **Global setup:** The integration global setup starts a dev server — component tests (jsdom) don't need this. Workspace projects must use different setup files.
  - **`'use client'` directive:** Components with `'use client'` still import fine in jsdom Vitest — the directive is a Next.js bundler hint, not a runtime restriction.
  - **Admin auth for E2E:** Supabase Auth stores session in cookies. Playwright's `storageState` captures cookies after login. The login page is at `/admin/login` and uses `signInWithPassword`. Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (already loaded by playwright.config.ts).
  - **Test credentials:** Admin Supabase user credentials must be available as environment variables (`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`) in `.env.local`.
  - **Visual regression baselines:** `.gitignore` has `*.spec.ts-snapshots/` which blocks Playwright baselines. Must add negation rule for visual test baselines.
  - **Google Places in E2E:** Registration form Step 0 requires location from PlacesAutocomplete (depends on Google Maps API). Strategy: fill city field directly via `page.fill()` and set country via `page.evaluate()` to bypass autocomplete. If that doesn't trigger the form's state update, test will verify only up to the location field and document the limitation.
  - **`npm test` script:** After workspace migration, bare `npm test` runs both projects (starts dev server for integration). Update to `vitest run --project unit` for fast default, or document the behavior.

- **Domain context:** Hará Match is a wellness professional marketplace. The registration form at `/profesionales/registro` is a 4-step form. The specialty system has 12 curated specialties with dedicated colors and support for custom specialties. Admin pages are behind Supabase Auth.

## Runtime Environment

- **Start command:** `npm run dev` (port 3000)
- **Health check:** `/api/health` (to be created)
- **Restart:** Kill process on port 3000, re-run `npm run dev`

## Assumptions

- `@testing-library/react` v14+ is compatible with React 18.3 — supported by React Testing Library docs. All tasks depend on this.
- `@testing-library/jest-dom` v6+ works with Vitest — supported by vitest docs and widespread community usage. Tasks 2-4 depend on this.
- Playwright is already installed (`@playwright/test` in devDependencies) but browsers may not be installed — `npx playwright install chromium` needed. Tasks 5-7 depend on this.
- Supabase Auth credentials for E2E can be stored in `.env.local` — supported by the existing dotenv pattern in playwright.config.ts. Task 5 depends on this.
- Components using `'use client'` can be imported in jsdom tests — supported by the fact that this is a bundler directive, not a runtime API.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Vitest workspace migration breaks existing integration tests | Medium | High | Run existing `npm run test:integration` after workspace config change and verify same results (8 pre-existing failures, 4 passes) |
| Visual regression screenshots are flaky due to font rendering differences | Medium | Medium | Use `maxDiffPixelRatio: 0.01` threshold. Run screenshots in headless Chromium only. |
| Admin E2E auth fails because credentials not in env | Low | Medium | Create a `.env.test` template with placeholder vars. Document required setup in the plan. |
| Component tests need Next.js mocking (useRouter, useParams) | High | Low | Use `next/navigation` mock setup in vitest.setup.ts — standard pattern for Next.js component testing. |

## Goal Verification

### Truths

1. `npm run test:unit` runs component tests in jsdom and passes
2. `npm run test:integration` still works exactly as before (same 4 passes, 8 pre-existing failures)
3. `npm run test:e2e` runs Playwright tests against the dev server
4. `npm run test:visual` captures screenshots and compares against baselines
5. Chip component has tests for both `specialty` and `variant` prop paths
6. Registration form E2E test navigates through at least Step 0 and Step 1

### Artifacts

- `vitest.workspace.ts` — workspace config with unit and integration projects
- `__tests__/setup/component-setup.ts` — jsdom + jest-dom + Next.js mocks
- `app/components/ui/Chip.test.tsx` — Chip component tests
- `app/profesionales/registro/components/SpecialtySelector.test.tsx` — SpecialtySelector tests
- `app/admin/professionals/[id]/review/components/SpecialtyMapper.test.tsx` — SpecialtyMapper tests
- `__tests__/e2e/registration-flow.spec.ts` — registration form E2E
- `__tests__/e2e/visual/pages.spec.ts` — visual regression screenshots
- `app/api/health/route.ts` — health check endpoint

## E2E Test Scenarios

### TS-001: Registration form flow
**Priority:** Critical
**Preconditions:** Dev server running, no auth required
**Mapped Tasks:** Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profesionales/registro` | Form loads, Step 0 "Datos personales" visible |
| 2 | Fill name, email, select location (if available), fill phone | Fields accept input, no validation errors |
| 3 | Click "Continuar" | Step 1 "Perfil profesional" visible |
| 4 | Select 2 curated specialties from toggles | Toggles change to active style |
| 5 | Click "Agregar otra especialidad", type "Mindfulness" | Custom input appears, text entered |
| 6 | Click "Continuar" | Step 2 visible |

### TS-002: Visual regression — key pages
**Priority:** High
**Preconditions:** Dev server running
**Mapped Tasks:** Task 7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/` | Home page screenshot matches baseline |
| 2 | Navigate to `/profesionales/registro` | Registration page screenshot matches baseline |
| 3 | Navigate to `/admin/login` | Login page screenshot matches baseline |
| 4 | Navigate to `/profesionales/registro/confirmacion` | Confirmation page screenshot matches baseline |

## Progress Tracking

- [x] Task 1: Install dependencies + Vitest workspace config
- [x] Task 2: Component test setup + Next.js mocks
- [x] Task 3: Component tests — Chip, Badge, Alert, GlassCard
- [x] Task 4: Component tests — SpecialtySelector, SpecialtyMapper, Button, Modal
- [x] Task 5: Playwright setup + admin auth + gitignore fix
- [x] Task 6: E2E tests — registration flow + public profile
- [x] Task 7: Visual regression — page screenshots
      **Total Tasks:** 7 | **Completed:** 7 | **Remaining:** 0

## Implementation Tasks

### Task 1: Install dependencies + Vitest workspace config

**Objective:** Install React Testing Library + jsdom, convert single Vitest config to workspace with separate unit (jsdom) and integration (node) projects.

**Dependencies:** None

**Files:**

- Create: `vitest.workspace.ts` — workspace config defining two projects
- Modify: `vitest.config.ts` — rename/transform (or delete in favor of workspace)
- Modify: `package.json` — add dependencies, update scripts

**Key Decisions / Notes:**

- Install: `@testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`
- Workspace defines two projects:
  - `unit`: `environment: 'jsdom'`, `include: ['app/**/*.test.{ts,tsx}']`, `setupFiles: ['__tests__/setup/component-setup.ts']`
  - `integration`: `environment: 'node'`, `include: ['__tests__/integration/**/*.test.ts']`, `globalSetup: ['__tests__/setup/global-setup.ts']`, `testTimeout: 30000`
- Both share `resolve.alias` for `@` prefix
- Delete old `vitest.config.ts` (replaced by workspace)
- Update `test:unit` script to: `vitest run --project unit`
- Update `test:integration` script to: `vitest run --project integration`
- Add `test:all` script: `vitest run`

**Definition of Done:**

- [ ] `npm run test:unit` runs (may have 0 tests, that's ok)
- [ ] `npm run test:integration` produces same results as before (4 pass, 8 fail)
- [ ] `npm run build` still succeeds
- [ ] No TypeScript errors

**Verify:**

- `npm run test:integration 2>&1 | tail -5` — verify same pass/fail counts
- `npm run build`

---

### Task 2: Component test setup + Next.js mocks

**Objective:** Create the component test setup file with jest-dom matchers and Next.js mock stubs (useRouter, useParams, next/image, next/link).

**Dependencies:** Task 1

**Files:**

- Create: `__tests__/setup/component-setup.ts` — jest-dom import + Next.js mocks

**Key Decisions / Notes:**

- Import `@testing-library/jest-dom/vitest` for matcher extensions (toBeVisible, toHaveTextContent, etc.)
- Mock `next/navigation`: `useRouter` returns `{ push: vi.fn(), back: vi.fn(), replace: vi.fn(), refresh: vi.fn() }`, `useParams` returns `{}`
- Mock `next/image`: render plain `<img>` tag
- Mock `next/link`: render plain `<a>` tag
- Do NOT mock `@/lib/design-constants` — we want to test with real constants
- Environment variable: `SKIP_ENV_VALIDATION=true` (already set in existing vitest config)

**Definition of Done:**

- [ ] Setup file exists and is referenced by the unit project in workspace config
- [ ] A minimal test importing a component and using jest-dom matchers works
- [ ] No TypeScript errors

**Verify:**

- Create a throwaway test, run `npm run test:unit`, verify it passes, then delete

---

### Task 3: Component tests — Chip, Badge, Alert, GlassCard

**Objective:** Write component tests for 4 core UI components testing props, variants, and rendering.

**Dependencies:** Task 2

**Files:**

- Create: `app/components/ui/Chip.test.tsx`
- Create: `app/components/ui/Badge.test.tsx`
- Create: `app/components/ui/Alert.test.tsx`
- Create: `app/components/ui/GlassCard.test.tsx`

**Key Decisions / Notes:**

- **Chip tests:** Test variant prop (success/warning/info/brand/neutral renders correct classes), specialty prop (curated key renders colored chip with Spanish label, unknown key renders neutral with raw text as label), discriminated union (label optional when specialty provided, label required when variant used)
- **Badge tests:** Test variant rendering, text content
- **Alert tests:** Test variant rendering (success, warning, error, info), children rendering, dismissibility if applicable
- **GlassCard tests:** Test children rendering, className passthrough, liquid-glass class presence
- Use `render()` from `@testing-library/react`, `screen` for queries, `expect(...).toBeInTheDocument()` pattern
- Test CSS classes (not computed styles) — e.g., `expect(chip).toHaveClass('bg-sp-teal-weak')`

**Definition of Done:**

- [ ] 4 test files created, all pass
- [ ] Chip: ≥6 test cases (3 variants, 2 specialty, 1 unknown specialty)
- [ ] Badge, Alert, GlassCard: ≥2 test cases each
- [ ] `npm run test:unit` passes

**Verify:**

- `npm run test:unit`

---

### Task 4: Component tests — SpecialtySelector, SpecialtyMapper, Button, Modal

**Objective:** Write component tests for the specialty system components and remaining core UI components.

**Dependencies:** Task 2

**Files:**

- Create: `app/profesionales/registro/components/SpecialtySelector.test.tsx`
- Create: `app/admin/professionals/[id]/review/components/SpecialtyMapper.test.tsx`
- Create: `app/components/ui/Button.test.tsx`
- Create: `app/components/ui/Modal.test.tsx`

**Key Decisions / Notes:**

- **SpecialtySelector tests:** Toggle curated specialty, add custom specialty, duplicate detection (type "Ansiedad" as custom → error), max 2 custom fields, validation (too short, too long, invalid chars), onChange fires with correct array
- **SpecialtyMapper tests:** Renders curated chips without dropdown, renders custom chips with dropdown, selecting curated option from dropdown calls onChange with updated array, "Aprobar como está" keeps custom text
- **Button tests:** Variant rendering, disabled state, onClick handler
- **Modal tests:** Open/close behavior, children rendering, escape key close, overlay click close
- Use `@testing-library/user-event` for interactions (click, type)
- SpecialtySelector and SpecialtyMapper receive `selected`/`specialties` and `onChange` as props — test as controlled components

**Definition of Done:**

- [ ] 4 test files created, all pass
- [ ] SpecialtySelector: ≥6 test cases (toggle, add custom, duplicate, validation, remove custom)
- [ ] SpecialtyMapper: ≥4 test cases (curated display, custom display, map action, keep action)
- [ ] Button, Modal: ≥2 test cases each
- [ ] `npm run test:unit` passes

**Verify:**

- `npm run test:unit`

---

### Task 5: Playwright setup + admin auth + gitignore fix

**Objective:** Set up Playwright admin auth with storageState. Install Chromium browser. Fix gitignore for visual baselines.

**Dependencies:** None (can run in parallel with Tasks 1-4)

**Files:**

- Create: `__tests__/e2e/setup/auth.setup.ts` — Playwright setup project that logs into admin and saves storageState
- Modify: `playwright.config.ts` — add setup project, configure storageState for admin tests, add visual test project
- Modify: `package.json` — add `test:e2e` and `test:visual` scripts
- Modify: `.gitignore` — add negation rule for visual baselines

**Key Decisions / Notes:**

- `/api/health` already exists (`app/api/health/route.ts`) — returns 200, sufficient for Playwright webServer check
- Playwright setup project pattern: `{ name: 'auth-setup', testMatch: '**/auth.setup.ts' }`, other projects depend on it
- Auth setup: navigate to `/admin/login`, fill email/password from `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` env vars, submit, save `storageState` to `__tests__/e2e/.auth/admin.json`
- Add `__tests__/e2e/.auth/` to `.gitignore`
- Two Playwright projects: `public` (no auth), `admin` (uses storageState from setup)
- Visual test project: `visual` (no auth, separate from flow tests)
- Add scripts: `test:e2e` → `playwright test --project=public`, `test:visual` → `playwright test --project=visual`
- Run `npx playwright install chromium` as part of setup verification
- Fix `.gitignore`: add `!__tests__/e2e/visual/*.spec.ts-snapshots/` negation rule under Testing section
- Required env vars for admin auth: `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (last two already in `.env.local`)

**Definition of Done:**

- [ ] Playwright config has setup + public + admin + visual projects
- [ ] `__tests__/e2e/.auth/` in `.gitignore`
- [ ] `npm run build` succeeds
- [ ] `npx playwright install chromium` succeeds

**Verify:**

- `curl http://localhost:3000/api/health`
- `npm run build`
- `npx playwright install chromium`

---

### Task 6: E2E tests — registration flow + public profile

**Objective:** Write Playwright E2E tests for the professional registration form flow and public profile page.

**Dependencies:** Task 5

**Mapped Scenarios:** TS-001

**Files:**

- Create: `__tests__/e2e/registration-flow.spec.ts`
- Create: `__tests__/e2e/public-profile.spec.ts`

**Key Decisions / Notes:**

- Registration flow: navigate to `/profesionales/registro`, fill Step 0 fields (name, email, location mock or real, phone), advance to Step 1, select specialties, add custom specialty, advance to Step 2 — verify progression
- Location field (Google Places) may not work in Playwright (requires Google Maps API key and real autocomplete). Options: (1) fill manually and skip autocomplete, (2) mock the autocomplete response. Recommend: fill the city field directly and set the country via JS evaluation, or accept that the "Continuar" button stays disabled without location and test up to that point.
- Public profile: use a known professional slug from the DB, or create one via the API in a beforeAll hook. Verify the profile page renders with specialties shown as colored chips.
- If no professionals exist in DB, the public profile test should gracefully skip.

**Definition of Done:**

- [ ] Registration flow test navigates through Step 0 → Step 1 (or as far as possible without Google Places)
- [ ] Registration flow verifies specialty toggles are clickable and custom field appears
- [ ] Public profile test loads a profile page (if data available) or skips gracefully
- [ ] `npm run test:e2e` passes (may skip some tests based on DB state)

**Verify:**

- `npx playwright test --project=public`

---

### Task 7: Visual regression — page screenshots

**Objective:** Create visual regression tests that capture baseline screenshots of key pages and compare on subsequent runs.

**Dependencies:** Task 5

**Mapped Scenarios:** TS-002

**Files:**

- Create: `__tests__/e2e/visual/pages.spec.ts`

**Key Decisions / Notes:**

- Use Playwright's `expect(page).toHaveScreenshot('name.png')` for comparison
- First run creates baselines in `__tests__/e2e/visual/pages.spec.ts-snapshots/`
- Subsequent runs compare against baselines — fails if visual changes detected
- Pages to screenshot: `/` (home), `/profesionales/registro` (step 0), `/admin/login`, `/profesionales/registro/confirmacion` (confirmation page)
- Skip `/p/{slug}` in visual tests — requires real DB data; unreliable without seeding. Replaced with the static confirmation page as the 4th screenshot.
- Set viewport to `1280x720` for consistent screenshots
- Add `maxDiffPixelRatio: 0.01` for tolerance
- Add `test:visual:update` script for updating baselines: `playwright test --project=visual --update-snapshots`
- Screenshot baselines should be committed to git (they're the reference)

**Definition of Done:**

- [ ] Visual test captures 4 page screenshots
- [ ] First run creates baseline snapshots
- [ ] Second run passes (no visual changes)
- [ ] `npm run test:visual` works
- [ ] `npm run test:visual:update` works for refreshing baselines

**Verify:**

- `npx playwright test --project=visual` (first run: creates baselines)
- `npx playwright test --project=visual` (second run: should pass)

## Open Questions

None — all decisions resolved during planning.

## Deferred Ideas

- **Admin E2E tests:** Test admin review flow (approve, reject, specialty mapping) — requires admin auth storageState + seeded professional data
- **CI/CD integration:** GitHub Actions workflow running all test levels on PR
- **Coverage thresholds:** Enforce ≥80% component test coverage once baseline is established
- **Component-level visual regression:** Screenshot individual components in isolation (requires Vitest browser mode or Storybook)
- **Tests for remaining components:** Input, Table, EmptyState, Card, SectionHeader, PageBackground
