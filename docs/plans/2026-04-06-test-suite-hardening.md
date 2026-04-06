# Test Suite Hardening Implementation Plan

Created: 2026-04-06
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Harden the existing 26 component tests + 7 E2E specs into a resilient, automated suite that catches real regressions — without adding volume. Fix stale tests, replace brittle CSS class assertions with behavior-based ones, eliminate silent E2E skips, and gate every push with a pre-push hook.

**Architecture:** No new test framework or tooling — work within existing Vitest (unit) + Playwright (E2E). Add a shell-based git pre-push hook (zero dependencies). Consolidate where possible, delete what's stale.

**Tech Stack:** Vitest, Playwright, shell script (pre-push hook), existing npm scripts.

## Scope

### In Scope

- Fix stale/broken tests (Clerk reference in admin-auth-gating, home page coupling in ui-smoke)
- Replace pure-styling CSS class assertions (Badge, Alert, GlassCard) with behavior/rendering tests
- Make E2E tests fail loudly when seed data is missing (no silent skips)
- Add pre-push git hook that runs unit tests before every push
- Add `npm run test:preflight` script that runs unit + lint

### Out of Scope

- New test files for registration form, custom hooks (deferred — separate effort)
- GitHub Actions CI setup (user chose pre-push only)
- Integration tests in the pre-push hook (too slow, require Supabase)
- Visual regression tests in the pre-push hook (require dev server)
- Changing the SpecialtySelector, SpecialtyMapper, Chip, Button, or Modal tests (they test real behavior, not just CSS)

## Approach

**Chosen:** Surgical fixes to existing files + shell-based pre-push hook

**Why:** Minimal changes with maximum impact. The existing test infrastructure is sound — Vitest workspace, Playwright multi-project, the `eventually()` helper — it just has dead spots and no automation gate. Fixing 7-8 files and adding a pre-push hook addresses all identified problems without adding complexity.

**Alternatives considered:**
- **Full rewrite of all tests:** Unnecessary — SpecialtySelector/SpecialtyMapper/Modal/Button tests are already good. Rewriting them would be churn.
- **Add simple-git-hooks/husky:** Adds a dependency for a solo project. A shell script in `.git/hooks/` with a setup script achieves the same with zero overhead.
- **CI-only gating (GitHub Actions):** Doesn't catch failures before push. User explicitly wants a local gate.

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:** Existing tests in `app/profesionales/registro/components/SpecialtySelector.test.tsx` — uses `screen.getByRole`, `userEvent.click`, tests real user interactions. This is the gold standard.
- **Conventions:** All tests import from `vitest` (`describe`, `it`, `expect`, `vi`). Component tests use `@testing-library/react`. Spanish text in assertions (e.g., `'Cerrar'`, `'Ansiedad'`).
- **Key files:**
  - `vitest.workspace.ts` — two projects: `unit` (jsdom, `app/**/*.test.{ts,tsx}`) and `integration` (node, `__tests__/integration/**/*.test.ts`)
  - `playwright.config.ts` — four projects: `auth-setup`, `public`, `admin`, `visual`
  - `__tests__/setup/component-setup.ts` — mocks for Next.js router, image, link
  - `package.json` scripts: `test:unit`, `test:e2e`, `test:visual`, `test:all`
- **Gotchas:**
  - Clerk package (`@clerk/nextjs`) is still in `package.json` dependencies even though it's unused — don't be confused by imports from it
  - The admin-auth-gating test is gated behind `REQUIRE_ADMIN_AUTH=true` env var — it normally doesn't run
  - E2E tests read `.e2e-test-data.json` for seed data — this file is gitignored and created by `npm run qa:seed-e2e`

## Assumptions

- Pre-push hook can run `npm test` (unit tests, 1.37s) without significantly slowing down the push workflow — supported by current test speed. Tasks 5-6 depend on this.
- The `.e2e-test-data.json` seed data file is created by `npm run qa:seed-e2e` — supported by `package.json` scripts. Task 4 depends on this.
- Badge, Alert, and GlassCard have no meaningful behavior beyond rendering — supported by reading the component source (pure presentational). Tasks 1-2 depend on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Pre-push hook slows down workflow | Low | Medium | Unit tests run in 1.37s — acceptable. Hook can be bypassed with `--no-verify` if needed. |
| New devs don't have hook installed | Medium | Medium | Add `scripts/setup-hooks.sh` and document in README. Add postinstall npm script. |
| Removing class assertions loses design-system contract | Low | Low | Only removing from Badge/Alert/GlassCard (pure presentational). Chip keeps class assertions because they verify the specialty color system contract. |

## Goal Verification

### Truths

1. All 26 unit tests still pass (no regressions from rewrites)
2. Badge, Alert, GlassCard tests verify rendering and content — not CSS class names
3. `admin-auth-gating.spec.ts` no longer references Clerk
4. `ui-smoke.spec.ts` tests are resilient to home page redesign
5. E2E tests that need seed data fail with a clear error message when it's missing
6. `git push` is blocked when unit tests fail
7. `npm run test:preflight` exists and runs unit tests (lint omitted from preflight — caught by IDE)

### Artifacts

- Modified: `app/components/ui/Badge.test.tsx`, `Alert.test.tsx`, `GlassCard.test.tsx`
- Modified: `__tests__/e2e/admin-auth-gating.spec.ts`, `ui-smoke.spec.ts`
- Modified: `__tests__/e2e/public-contact.spec.ts`, `admin-match-flow.spec.ts`, `public-profile.spec.ts`
- Created: `.git/hooks/pre-push` (shell script)
- Created: `scripts/setup-hooks.sh`
- Modified: `package.json` (add `test:preflight` script, add `postinstall` hook setup)

## Progress Tracking

- [x] Task 1: Rewrite pure-styling component tests
- [x] Task 2: Fix stale E2E tests (Clerk, home page coupling)
- [x] Task 3: Make E2E tests fail loudly on missing seed data
- [x] Task 4: Add pre-push hook and setup script
      **Total Tasks:** 4 | **Completed:** 4 | **Remaining:** 0

## Implementation Tasks

### Task 1: Rewrite pure-styling component tests (Badge, Alert, GlassCard)

**Objective:** Replace CSS class assertions with behavior-based tests that verify rendering, content, and accessibility rather than implementation details.

**Dependencies:** None

**Files:**

- Modify: `app/components/ui/Badge.test.tsx`
- Modify: `app/components/ui/Alert.test.tsx`
- Modify: `app/components/ui/GlassCard.test.tsx`

**Key Decisions / Notes:**

- **Badge:** Currently tests `toHaveClass('bg-brand-weak', 'text-brand')`. Replace with: renders text content, passes className, renders as inline element. The component is a `<span>` that renders children with a variant — test that it renders, not which classes it uses.
- **Alert:** Currently tests `toHaveClass('bg-info-weak')`. Replace with: renders children, renders title when provided, renders correct icon per variant (each variant has a unique SVG icon — test presence of `svg` element), passes className.
- **GlassCard:** Currently tests `toHaveClass('liquid-glass', 'rounded-3xl')`. Replace with: renders children, passes className. This component is a simple wrapper — one test is sufficient.
- **Do NOT touch** Chip, Button, Modal, SpecialtySelector, or SpecialtyMapper tests — they test real behavior.
- Keep test count at 26 or fewer — consolidate if possible (e.g., Badge currently has 2 tests that could be 1).

**Definition of Done:**

- [ ] All tests pass (`npm run test:unit`)
- [ ] No `toHaveClass` calls referencing design token classes (e.g., `bg-brand-weak`, `bg-info-weak`, `bg-surface-2`) in Badge, Alert, or GlassCard test files
- [ ] Tests verify content rendering and accessibility, not CSS implementation

**Verify:**

- `npx vitest run --project unit --reporter=verbose`

---

### Task 2: Fix stale E2E tests (admin-auth-gating, ui-smoke)

**Objective:** Remove the Clerk reference from admin-auth-gating and decouple ui-smoke from the specific home page content.

**Dependencies:** None

**Files:**

- Modify: `__tests__/e2e/admin-auth-gating.spec.ts`
- Modify: `__tests__/e2e/ui-smoke.spec.ts`

**Key Decisions / Notes:**

- **admin-auth-gating.spec.ts line 25:** `expect(text).toContain('Clerk')` — Clerk was removed. The middleware now redirects to `/admin/login` (Supabase Auth). Update the assertion to match current behavior: when `REQUIRE_ADMIN_AUTH=true`, admin routes should redirect to login or return 503. Read the actual middleware to verify current behavior before changing.
- **ui-smoke.spec.ts:** Currently asserts `h1` text is "Hará Match" and looks for `a[href="/admin/leads"]`. These break on any home page redesign. Replace with resilient assertions: page loads (status 200), has visible heading (any text), Tailwind CSS is applied (computed style check is fine to keep — it tests infrastructure, not content).
- Both files are gated by env vars (`REQUIRE_ADMIN_AUTH`, seed data) — the tests themselves are fine, just the assertions are stale.

**Definition of Done:**

- [ ] `admin-auth-gating.spec.ts` has no reference to "Clerk"
- [ ] `ui-smoke.spec.ts` does not assert specific heading text or specific link href
- [ ] Both files are syntactically valid TypeScript

**Verify:**

- Read the modified files and confirm assertions match current app behavior
- `npx tsc --noEmit` on both files (if feasible)

---

### Task 3: Make E2E tests fail loudly on missing seed data

**Objective:** Replace `test.skip(!seedData, ...)` with `test.fail` / `throw` so missing seed data is an error, not a silent pass.

**Dependencies:** None

**Files:**

- Modify: `__tests__/e2e/public-contact.spec.ts`
- Modify: `__tests__/e2e/admin-match-flow.spec.ts`
- Modify: `__tests__/e2e/public-profile.spec.ts`

**Key Decisions / Notes:**

- **Pattern:** Replace `test.skip(!seedData, 'message')` with a `test.beforeAll` that throws a clear error:
  ```typescript
  test.beforeAll(() => {
    if (!seedData) {
      throw new Error(
        'E2E seed data not found. Run: npm run qa:seed-e2e\n' +
        'This creates .e2e-test-data.json with test fixtures.'
      )
    }
  })
  ```
- **public-profile.spec.ts** has a different pattern — it fetches from `/api/debug/professionals` and skips if no slug. This is a runtime dependency, not a seed data issue. Change the skip to a clear error: "No active professionals in DB — seed data required."
- **Keep** the `REQUIRE_ADMIN_AUTH` skip — that's a legitimate environment toggle, not missing data.
- **auth.setup.ts** also has a skip for missing credentials — keep it as a skip since admin E2E credentials are optional.

**Definition of Done:**

- [ ] No `test.skip` calls that reference missing seed data or missing professionals
- [ ] Missing seed data produces a clear error message telling the user what to run
- [ ] `REQUIRE_ADMIN_AUTH` skips are preserved (legitimate env toggle)

**Verify:**

- Read modified files and confirm the error messages are clear
- Optionally: run `npx playwright test --project=public --list` to verify test discovery works

---

### Task 4: Add pre-push hook and setup script

**Objective:** Create a git pre-push hook that runs unit tests before every push, plus a setup script to install it.

**Dependencies:** Tasks 1-3 (the tests being run by the hook should be fixed first)

**Files:**

- Create: `scripts/setup-hooks.sh`
- Modify: `package.json` (add `test:preflight` script, add `prepare` script)

**Key Decisions / Notes:**

- **Pre-push hook script** (installed to `.git/hooks/pre-push` by setup script):
  ```bash
  #!/bin/sh
  echo "Running preflight tests..."
  npm run test:preflight
  exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo "❌ Tests failed. Push blocked."
    echo "   Fix the failing tests or use --no-verify to bypass."
    exit 1
  fi
  echo "✅ All preflight tests passed."
  ```
- **`test:preflight` npm script:** `vitest run --project unit` — just unit tests (1.37s). Don't include lint in preflight (lint can be slow and is already caught by IDE).
- **`scripts/setup-hooks.sh`:**
  ```bash
  #!/bin/sh
  # Install git hooks for Hará Match
  cp scripts/hooks/pre-push .git/hooks/pre-push
  chmod +x .git/hooks/pre-push
  echo "✅ Git hooks installed."
  ```
- **Store the hook source** at `scripts/hooks/pre-push` (version-controlled). The setup script copies it to `.git/hooks/`.
- **`prepare` script in package.json:** `"prepare": "sh scripts/setup-hooks.sh 2>/dev/null || true"` — runs automatically on `npm install`. The `|| true` ensures it doesn't fail in CI or environments without `.git`.
- Do NOT use the git `core.hooksPath` config — it changes behavior globally and can confuse other projects.

**Definition of Done:**

- [ ] `scripts/hooks/pre-push` exists and is a valid shell script
- [ ] `scripts/setup-hooks.sh` exists and copies the hook to `.git/hooks/`
- [ ] `package.json` has `test:preflight` and `prepare` scripts
- [ ] Running `sh scripts/setup-hooks.sh` installs the hook
- [ ] Pushing with a failing test is blocked (verified manually)

**Verify:**

- `sh scripts/setup-hooks.sh && ls -la .git/hooks/pre-push`
- `npm run test:preflight` (should pass, ~1.4s)

## Open Questions

None — all decisions resolved during clarification.

### Deferred Ideas

- **Registration form tests:** The 807-line form has zero tests. This needs a dedicated effort (probably another `/spec`) since it requires understanding the multi-step state machine, Google Places mocking, and file upload flow.
- **Custom hook tests:** `useRecommendations`, `useSwipeGesture`, `useRevealTransition`, `useMediaQuery` — these are the core UX logic and deserve coverage, but testing hooks requires `renderHook` patterns and possibly mocking fetch/gestures. Separate effort.
- **GitHub Actions CI:** Would provide a remote safety net. Can be added later as a complement to the pre-push hook.
- **Integration tests in preflight:** Currently too slow (require Supabase + dev server startup). Could be added if test speed improves.
