# Registro Almanac and Professional Account Implementation Plan

Created: 2026-11-06
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** A professional applies at `/registro` (design 12, 4 steps, almanac look) and, in the same submit, gets an account with their email and a password and the `professional` role. Until the admin approves them, they can sign in and see "Tu perfil está en revisión", but cannot edit. The public bottom menu has one "Ingresar" link for professionals, to `/pro/login`. Admin access is by direct URL only. The home keeps its centered logo without account links in the masthead, per the user revision on 2026-11-06.

## Out of Scope

- Restyling `/pro/perfil` remains out of scope. The user explicitly brought `/pro/login` into scope after reviewing the public entry flow; its new visual follows the established registration/admin almanac patterns.
- A professional who was rejected and already has an account cannot re-apply with the same email. They get "Ya tenés una cuenta con este email" and the contact address. Logged in ISSUES.md.
- Email confirmation before the first sign-in (user decision: the account works right away).

## Approach

**Chosen:** `POST /api/professionals/register` creates the Supabase Auth user first (`supabaseAdmin.auth.admin.createUser` with `email_confirm: true` and `app_metadata.role = 'professional'`), then inserts the professional row with that `user_id`, and deletes the auth user if the insert fails. The form is rebuilt from design 12 and split into step components.
**Why:** One request keeps the account and the application consistent, with no half-created state left behind. The cost is a delete-on-failure path that must be tested, plus one new public write that needs a rate limit.

## Context for Implementer

- **Design source.** Claude Design project `d0e3236f-a77b-4d60-b083-b3dd4cdd9da2`, file `Hara Vital App.dc.html`, section `t12` (12a, lines 446 to 591 of the rendered file; 12b is the send error). The home pill is in section `t11`, line 891. A rendered copy is in the session scratchpad (`.../f5c80722-.../scratchpad/design/raw.html`). If it is gone, re-download it with `render_preview` and keep `serve_url` out of every user-facing text. The design's sample names and numbers are placeholders and are never shipped.
- **The password is not in the design.** It goes in step 1 under Email, in the same field style: "Contraseña*", at least 8 characters, with a "Mostrar" toggle. The hint reads "La vas a usar para entrar a tu perfil".
- **Colors and fonts.** Use the same token mapping as the admin and concierge pages: page `bg-background`, cards `bg-gray-50`, fields `bg-background` or the `ALMANAC_INPUT_CLASS` from `app/solicitar/ConciergeSteps.tsx`, primary `bg-brand-dark`, selected `bg-foreground`, titles `font-almanac-serif`, the rest `font-almanac`. No new hex values. Copy uses vos, with no em or en dashes.
- **Roles.** `app_metadata.role` is read by `roleOf` (`lib/admin-auth.ts`). `/pro` only lets in `professional` (`middleware.ts`). Signing in at `/pro/login` as the admin ends on `/admin/leads`, because the middleware sends the admin away from `/pro`. The public menu entry is only presented as professional access; the admin uses `/admin/login` directly.
- **Production check (memory: test-in-production-mode).** The registration, the sign-in and the review notice are exercised against `npm run build && npm start`, not only `npm run dev`.

## Assumptions

- `supabaseAdmin.auth.admin.createUser` returns an error with status 422 when the email already exists. Task 1 checks this on the real API, using a throwaway address that it deletes right after.
- The approved-email path can tell whether the professional has an account by `professionals.user_id`. Task 4 depends on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| The auth user is created and the professional insert fails, which leaves an orphan account that blocks the email | Medium | High | Delete the auth user on any insert error, with a test that asserts `deleteUser` is called with that id |
| Public account creation gets abused | Medium | Medium | `ratelimit.limit('register:ip:<ip>', { limit: 5, window: '1 h' })` before any write, returning 429. The limiter fails open while Upstash is down (ISSUES 16), so this protects once it is back |
| The password reaches logs or the database | Low | High | The password is only passed to `createUser`. It is never stored in `professionals`, never logged and never echoed back. A test asserts the insert payload has no `password` key |

## E2E Test Scenarios

### TS-001: Apply, get an account, see the review notice
**Priority:** Critical
**Preconditions:** Production build on port 3000. A throwaway email the user agrees to (the professional and auth user are deleted afterwards through the admin and the Supabase API).
**Mapped Tasks:** Task 1, Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/registro` | Design 12 step 1: progress in 4 parts, serif title, fields card, "Continuar" disabled with what is missing |
| 2 | Fill step 1 including a password of 8+ characters, go through steps 2 to 4, and send | The "¡Solicitud enviada!" screen with the "¿Qué sigue?" steps |
| 3 | Open `/pro/login`, sign in with that email and password | `/pro/perfil` shows "Tu perfil está en revisión" and no edit form |
| 4 | Call `POST /api/pro/profile` from that page | 403, nothing saved |

### TS-002: Validation in the form
**Priority:** High
**Preconditions:** `/registro` open.
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type an email without a domain and leave the field | "Revisá el email: parece que le falta algo." |
| 2 | Type a 5-character password | "Continuar" stays disabled and says the password needs 8 characters |
| 3 | On step 3, set the minimum price above the maximum | "El mínimo no puede ser mayor que el máximo." |

### TS-003: Public navigation entry points
**Priority:** High
**Preconditions:** Production build.
**Mapped Tasks:** Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/` | Centered logo; bottom menu has only "Ingresar" for professional access, with no admin or separate registration entry |
| 2 | Click "Ingresar" | `/pro/login`, professional sign-in page |
| 3 | Inspect the public menu | Exactly Inicio, Buscar, Diario, Ayuda and Ingresar; no admin entry |

## Progress Tracking

- [x] Task 1: Registration creates the account (API)
- [x] Task 2: `/registro` rebuilt from design 12, with the password field
- [x] Task 3: `/pro` while in review: notice instead of the form, edits blocked
- [x] Task 4: Emails say how to sign in
- [x] Task 5: Registration and login links in the public bottom menu (revised by user)
- [x] Task 6: Docs, production-mode run, commit and push

## Implementation Tasks

### Task 1: Registration creates the account (API)

**Objective:** `POST /api/professionals/register` requires a `password` (8 to 72 characters). It is rate-limited per IP. It creates the auth user with `email_confirm: true` and `app_metadata.role: 'professional'`, inserts the professional with `user_id`, and deletes the auth user if the insert fails. Verified by TS-001.

**Files:**

- Modify: `app/api/professionals/register/route.ts`
- Test: `app/api/professionals/register/route.test.ts`

**Key Decisions / Notes:**

- Order: validate every field, check the rate limit and the rejected cooldown (existing code at `route.ts:141`), then `createUser`, then insert. Creating the user last before the insert keeps failed validations from leaving accounts behind.
- If `createUser` reports the email exists, return 409 "Ya tenés una cuenta con este email. Entrá desde Hara o escribinos a centrovitalhara@gmail.com." and insert nothing.
- If the insert fails for any reason, call `supabaseAdmin.auth.admin.deleteUser(userId)` and keep the existing 409 (duplicate email) or 500 response.
- `password` is read from FormData and JSON, used only in `createUser`, and never logged, stored or echoed.

**Definition of Done:**

- [x] A missing or 7-character password gets 400 and calls neither `createUser` nor insert. A 73-character one also gets 400.
- [x] On success, `createUser` is called with the email, the password, `email_confirm: true` and `app_metadata: { role: 'professional' }`. The insert has that `user_id` and no `password` key.
- [x] When the insert fails, `deleteUser` is called with the created id. When `createUser` says the email exists, the response is 409 and nothing is inserted.
- [x] A rate-limit failure gets 429 before any write.
- [x] Verify: `npx vitest run --project unit app/api/professionals/register`

### Task 2: `/registro` rebuilt from design 12, with the password field

**Objective:** Rebuild the page to design 12: the "← Volver" back link and logo (user revision after initial review), "SOY PROFESIONAL", progress in 4 segments, a serif title with an italic word, one fields card per step, Atrás and Continuar fixed at the bottom with the missing-field hint, the send error above the buttons, and the "¡Solicitud enviada!" confirmation. Keep every current field, validation, the city autocomplete and the WhatsApp country code. Add the password to step 1. Verified by TS-001 and TS-002.

**Files:**

- Modify: `app/registro/RegistroForm.tsx` (state, step logic, submit; under 300 lines)
- Create: `app/registro/components/RegistroSteps.tsx` (the four step bodies), `app/registro/components/RegistroShell.tsx` (header, progress, title, bottom bar, confirmation)
- Modify: `app/registro/components/SpecialtySelector.tsx` (pills restyle only)
- Modify: `app/registro/confirmacion/page.tsx` (redirects to `/registro`; the confirmation is now shown in place, as in the design)
- Test: `app/registro/RegistroForm.test.tsx`

**Key Decisions / Notes:**

- Step titles, subtitles and the "¿Qué sigue?" list come from the design's `rg` logic (read `segs`, `t1`, `t2`, `sub`, `hint` in the design file). The confirmation's step 2 changes to "Ya podés entrar con tu email y contraseña para ver tu perfil", because there is no set-password email any more.
- The confirmation is the design's `sent` state, rendered in place with the applicant's name and email (today the form does `router.push('/registro/confirmacion')` at `RegistroForm.tsx:230`, which cannot show them).
- Keep the existing submit (FormData to `/api/professionals/register`) and add `password`. On 409 or 429, show the server message above the buttons (12b).
- Reuse `PlacesAutocomplete` and the existing phone-country list. Do not add a dependency.
- The page is public: check the layout at 402px as well, because applicants use phones.

**Definition of Done:**

- [x] Step 1 cannot continue without a password of at least 8 characters. The hint names what is missing (test).
- [x] The submitted FormData includes `password` along with the existing fields (test asserts the body).
- [x] A 409 from the API shows its message above the buttons and stays on step 4 (test).
- [x] No em or en dashes and no hex colors in `app/registro`.
- [x] Verify: `npx vitest run --project unit app/registro` and TS-002 in Chrome (desktop and 402px)

### Task 3: `/pro` while in review: notice instead of the form, edits blocked

**Objective:** `/pro/perfil` shows "Tu perfil está en revisión. Te avisamos por email cuando esté publicado." for a `submitted` profile, and "Tu solicitud no fue aprobada." with the reason for a `rejected` one, instead of the edit form. `POST /api/pro/profile` returns 403 unless the professional's status is `active`. Verified by TS-001.

**Files:**

- Modify: `app/pro/perfil/page.tsx`, `app/api/pro/profile/route.ts`
- Test: `app/api/pro/profile/route.test.ts`

**Key Decisions / Notes:**

- The page already loads the professional by `user_id` (`page.tsx:20`). Add `status, rejection_reason` to the select and branch on it. The notice uses the current page look (out of scope to restyle).
- The API check sits right after the ownership lookup (`route.ts:121`), before any validation.

**Definition of Done:**

- [x] A `submitted` professional calling `POST /api/pro/profile` gets 403 and nothing is updated (test asserts no `update`).
- [x] An `active` professional still saves (existing tests stay green).
- [x] Verify: `npx vitest run --project unit app/api/pro/profile`

### Task 4: Emails say how to sign in

**Objective:** The "Recibimos tu solicitud" email says they can already sign in with their email and password to see their profile. The approval email, for a professional with an account (`user_id` set), says "Ya podés entrar con tu email y contraseña" with a link to `/pro/login` instead of the set-password link. Professionals without an account (approved before this change) keep the set-password link.

**Files:**

- Modify: `lib/email.ts`, `app/api/admin/professionals/[id]/route.ts`
- Test: `lib/email.test.ts`, `app/api/admin/professionals/[id]/route.test.ts` (both exist; extend them)

**Key Decisions / Notes:**

- The approve handler (`route.ts:213`) only calls `generateProAccessLink` when `existing.user_id` is null. Otherwise it passes `loginUrl: emailBaseUrl() + '/pro/login'` to `notifyProfessionalApproved`.
- Email copy in vos, no dashes. The existing "unos pocos días — " dash in `notifyRegistrationReceived` is rewritten.

**Definition of Done:**

- [x] Approving a professional with `user_id` sends the login link and never calls `generateProAccessLink` (test).
- [x] Approving one without `user_id` still sends the set-password link (test).
- [x] Verify: `npx vitest run --project unit lib/email app/api/admin/professionals`

### Task 5: One professional access link in the public bottom menu

**Objective (revised by the user, 2026-11-06):** Remove the masthead pill and login link. Keep the home logo centered and expose only "Ingresar" to `/pro/login` in the shared bottom menu, after Inicio, Diario and Ayuda. Search stays in the home filter bar. The user explicitly removed the separate registration and Entrar entries.

**Files:**

- Modify: `app/page.tsx` (restore the centered masthead), `app/components/AlmanacBottomNav.tsx` (five entries in equal columns)
- Update: `app/components/AlmanacBottomNav.test.tsx` (destinations and active state)

**Definition of Done:**

- [x] Only one professional access, Ingresar, is in the shared menu on home, Diario and Ayuda; no admin entry.
- [x] Verify final production layout and navigation at desktop, 402px and 320px, with no overlap or horizontal overflow.

### Task 6: Docs, production-mode run, commit and push

**Objective:** Update the docs, run TS-001 to TS-003 on a production build, clean up the throwaway applicant, then commit and push when the user approves.

**Files:**

- Modify: `CLAUDE.md` (registro entry), `ISSUES.md` (entry 17 done; new entry for rejected re-application with an existing account), `.claude/plans/hara.md`

**Key Decisions / Notes:**

- `Trivial:` docs only, plus the verification run.
- The throwaway auth user and professional row are removed with the admin's Eliminar (which cascades) and `auth.admin.deleteUser`, after the user agrees to the test email.

**Definition of Done:**

- [ ] TS-001 to TS-003 pass on `npm run build && npm start`.
- [x] No test applicant is left in `professionals` or in Supabase Auth.
- [x] Verify: `npx tsc --noEmit && npx vitest run --project unit && npm run build`

## Implementation Notes (2026-11-06, paused by usage limit)

- Task 1 done: account created in `app/api/professionals/register/route.ts` (rate limit, createUser, rollback with deleteUser). Tests and mutation checks pass. Real Supabase confirmed: duplicate email returns 422 `email_exists`.
- Task 2 in progress: code done (`RegistroForm.tsx`, `components/RegistroShell.tsx`, `components/RegistroSteps.tsx`, SpecialtySelector restyle, `/registro/confirmacion` redirects, old SiteHeader hidden on `/registro`). Unit tests pass and are mutation-checked. Browser check done for step 1 (email error, password hint, no old header, 400px fits). Still to check in Chrome: picking a city from the Google list (`PlacesAutocomplete` uses Google's widget, which synthetic JS events did not trigger), then steps 2 to 4 and the 402px view of each.
- Not started: Tasks 3 to 6. Nothing from this plan is committed. Dev server on port 3000, PID in `/tmp/hara-dev.pid`.

## Implementation Notes (2026-11-06, Codex continuation)

- Reviewed all uncommitted work from Tasks 1 and 2. Kept the existing form split and API contract.
- Registration review fixes: duplicate accounts are identified by the Auth error code rather than every 422; a weak password returns a password error. Insert exceptions also trigger account rollback. Rollback failures are logged without passwords.
- Task 2 accessibility fixes: input focus rings, labels for both location inputs and custom specialties, email/phone error associations, keyboard-accessible photo picker, and object URL cleanup. The form enforces the API's 72-character password maximum.
- Tasks 3, 4 and 5 implemented: submitted/rejected profiles have notices, only active profiles can edit; new accounts get login instructions and older applicants retain setup links; the home has both entry links.
- Existing E2E callers updated for the new labels, password and in-place confirmation. Removed fake state events and tests that silently skipped assertions. The full-flow test now checks login/review/403 and deletes the test Auth account as well as the profile and image.
- Verification so far: tsc clean; 108 unit files / 785 tests passed; production build passed; five public registration browser tests passed with the installed Google Chrome.
- Browser evidence is in `/tmp/hara-registro-proof`; the browser tool profile is occupied, so checks use an isolated Playwright Chrome instance. The production test config is `/tmp/hara-registro-playwright.config.mjs` (uses installed Chrome and `npm start`).
- The user authorized the temporary example.com account and its cleanup, including the normal email side effects. The live registration/sign-in/review/403 test passed and removed the profile, image and Auth user, with absence checks for both profile and Auth.
- Git writes remain pending final user approval, as required by Task 6.

## Final verification (2026-11-06)

| Check | Result | Evidence |
|-------|--------|----------|
| TypeScript | PASS | `npx tsc --noEmit` |
| Unit suite | PASS | 108 files, 786 tests; `/tmp/hara-registro-unit-final.log` |
| Production build | PASS | `npm run build`; `/tmp/hara-registro-build-final.log` |
| TS-001 | PASS | Real Supabase account, profile/image upload, password sign-in, review notice and edit API 403; Playwright full-flow test passed in 10.2 seconds; cleanup verified |
| TS-002 | PASS | Live Google city selection and all four steps at 1280px and 402px; password/email validation, min > max guard, photo preview, 409 error and confirmation; no page errors or horizontal overflow |
| TS-003 | PARTIAL | Home links navigate correctly at both widths; admin redirect is covered by middleware unit tests. Actual admin password sign-in was not exercised because E2E admin credentials are absent |
| Email behavior | PASS with delivery limit | Registration and both approval paths covered by unit tests. Resend rejected the example.com recipient during the real registration test, so inbox delivery was not verified |
| Final UI smoke | PASS | Five public browser tests and the isolated live Google flow re-run on the final production build without creating another account; `/tmp/hara-registro-public-final.log`, `/tmp/hara-registro-live-final.log` |

Final review also added focus transfer to each step/confirmation heading and a StrictMode regression test for returning to the photo preview after Atrás. No dependencies or migrations were added.

Docs updated: `CLAUDE.md`, `README.md`, `FINAL_SPEC.md`, `ISSUES.md` (17 done, 19 added), and `.claude/plans/hara.md`.

Remaining: final user approval for commit and push. The local production server remains on port 3000. Upstash's known outage still makes the configured registration limit fail open; it was explicitly parked for a separate review with the user. No deployment or git writes have been performed.

## User revision (2026-11-06, after the initial implementation review)

- The user rejected the masthead account links in a screenshot and asked to add the entry points to the bottom menu instead. The logo is centered again; the shared menu now has six equal entries. "Soy pro" is the concise visible label for the registration link.
- The registration back link now says "← Volver" instead of repeating the brand name beside the logo.
- The user also asked whether tests detect broken behavior. Running deliberate, reversible mutations against the existing tests; results will be recorded here. No new live accounts are needed.

### Mutation evidence for behavioral tests

A passing baseline was followed by nine independent deliberate defects. Each defect made its selected test fail on an assertion or an expected UI element that was missing. No syntax/import failures were counted. Original source files were restored byte for byte after every case.

| Deliberate defect | Existing test that failed |
|------------------|---------------------------|
| Password omitted from submitted FormData | RegistroForm: submits password and confirms name/email |
| API error treated as successful submission | RegistroForm: shows server error and remains on step 4 |
| Account given admin role | Registration API: confirmed professional account |
| Saved profile has no user_id | Registration API: account/profile linkage |
| No account rollback after failed profile insert | Registration API: deletes account after insert failure |
| Review edit guard removed | Profile API: submitted profile receives 403 before any changes |
| Editor shown to a submitted applicant | Profile page: review notice and no editor |
| Existing account receives another invitation | Admin approval: uses login without generateProAccessLink |
| Registration menu link points to login | Bottom menu: six entries map to the expected destinations |

Evidence: `/tmp/hara-registration-mutations/results.json` and the per-case logs in the same directory. The two DOM failures are expected test failures (missing error/review notice), alongside seven direct assertion failures. This is a sampled regression check, not proof that every possible defect is covered. The full browser test previously exercised real registration, sign-in and review blocking; these mutation checks use unit-level service mocks and create no accounts.

The functional suite does not judge visual quality. The rejected masthead layout was functionally correct, which is why its tests passed; that visual review was insufficient and the layout was corrected at the user's request.

### Verification after the navigation revision

- Production build and TypeScript passed. All 67 tests in the eight affected test files passed after restoring the deliberate mutations.
- Checked home, Diario and Ayuda at 1280px, 402px and 320px in production Chrome: six menu destinations, no overlap/overflow, each touch target at least 44px, and the home logo centered. Clicked registration, "← Volver" and login at every width. Screenshots were inspected at `/tmp/hara-nav-proof`; results are in `/tmp/hara-nav-browser.log`.
- No additional accounts, emails, commits or pushes were created for this revision.

## Final navigation contract (user clarification, 2026-11-06)

**Symptom:** The public menu has two professional account entries with confusing labels.
**Trigger:** Opening home, Diario or Ayuda.
**Root cause:** `app/components/AlmanacBottomNav.tsx:17` defines separate registration and login entries and a six-column layout based on an incorrect interpretation of the request.
**Behavior contract:** The public menu must have exactly Inicio, Buscar, Diario, Ayuda and one professional access link, "Ingresar", to `/pro/login`. No "Soy pro", "Entrar" or admin entry. The home keeps its centered logo. Existing search and active-page behavior remain unchanged. Admin access stays by direct `/admin/login` URL.
**Scope:** Shared menu source, existing menu test and current docs. No auth, registration, database or role changes. This precise change is authorized by the user's latest clarification; no additional plan approval is needed.

- [x] Task 1: Reproducing RED test. Change the expected navigation contract before modifying the source and observe the extra/wrong entries fail.
- [x] Task 2: Source fix. Remove the registration entry, name the sole professional access "Ingresar", and use five equal columns.
- [ ] Task 3: Quality gate. Targeted tests, TypeScript, build and the full unit suite; inspect production navigation on home/Diario/Ayuda at 320/402/1280px and click the sole professional access.

- RED evidence: `/tmp/hara-single-access-red.log`, one test failed with the extra Soy pro/Entrar entries before changing source.
- GREEN evidence: the existing menu contract was changed to exactly five destinations; 15 targeted menu/search tests passed after the source fix. The final production checks also passed. No accounts or auth logic changed.

### Final single-access verification evidence

- RED: existing navigation test failed with the old two-account-entry menu (`/tmp/hara-single-access-red.log`).
- Source fix: `AlmanacBottomNav` now defines exactly one professional entry, "Ingresar" to `/pro/login`, in a five-column menu.
- GREEN: 15 targeted tests passed; TypeScript and production build passed; the full unit suite passed afterwards, 108 files / 786 tests (`/tmp/hara-single-access-unit.log`).
- Production UI: home, Diario and Ayuda at 1280/402/320px all had exactly Inicio, Buscar, Diario, Ayuda and Ingresar; no admin entry, no overlap or horizontal overflow, touch targets at least 44px. Clicking Ingresar opened `/pro/login` and showed "Tu perfil en Hara". Screenshot inspected at `/tmp/hara-single-access-proof/home-402.png`; all results in `/tmp/hara-single-access-browser.log`.
- Quality gate limitation: `CI=1 npm run lint -- --no-cache` exited 1 because no ESLint configuration exists and Next asks to set it up. No configuration/dependencies were added. Task 3's lint portion remains unverified; other checks above passed.
- No additional live account, email, git write or deployment was made. The local production server remains on port 3000.

## Professional login redesign and navigation simplification (user request, 2026-11-06)

**Goal:** `/pro/login` uses the current almanac design, and the public bottom menu has exactly Inicio, Diario, Ayuda and Ingresar. Search stays in the home filter bar.
**Design contract:** Use existing registration/admin composition and tokens: Volver link, centered Hara logo, professional label, serif heading with italic accent, cream fields card, warm inputs and terracotta primary action. Remove the old global header and glass/background illustration from this page. Preserve sign-in, redirect and generic forgot-password response. Registration is reachable from inside this single professional entry, without another public menu item.
**Affected code:** pro login page/tests, SiteHeader exclusions/tests, shared bottom nav/tests, HomeSearch/Home page and home filter tests. No auth API, role, schema or profile-editor changes.

- [x] Step 1: Update behavioral tests for four menu entries, home-only search, professional login, invalid credentials and password recovery. Run them before source edits to identify expected failures.
- [x] Step 2: Apply the almanac layout in the existing login page and remove obsolete bottom-search wiring. Test affected modules.
- [x] Step 3: TypeScript, build and full unit suite; production browser check at 320/402/1280px for login, error/recovery states, navigation and preserved home search. Record real-service limits separately.

- Expected RED evidence: 8 failures in the three updated test modules against the old page/menu, including missing accessible field labels/recovery announcements and the duplicate search entry (`/tmp/hara-login-red.log`).
- Source implementation: existing login form restyled with registration/admin almanac tokens and composition; old SiteHeader excluded only for `/pro/login`; recovery remains generic and registration is reachable inside the professional login page. No new UI dependency or auth API changes.
- Removed the obsolete `onSearch` nav prop and `HomeBottomNav` wrapper after checking every caller. Home now renders the shared nav directly, while HomeSearchProvider and the filter-bar search keep their behavior, including existing #buscar deep links.
- Initial targeted result: 25 tests in four affected modules passed. TypeScript also identified a test-library option mismatch, which was corrected before the production build.

### Login redesign verification

- Production build and TypeScript passed; full unit suite passed: 108 files / 790 tests (`/tmp/hara-login-build.log`, `/tmp/hara-login-unit.log`).
- Production browser checks passed at 1280px, 402px and 320px: home, Diario and Ayuda have exactly Inicio, Diario, Ayuda and Ingresar; no duplicate Buscar, admin entry, overlap or horizontal overflow; touch targets remain at least 44px.
- The home filter-bar search still opens, accepts a query and closes. Ingresar navigates to the new professional login; the old header is absent and there is only one logo. Invalid credentials, recovery focus and generic confirmation, and the link to the registration application were verified in Chrome.
- Visual states were inspected at `/tmp/hara-login-proof/login-402.png`, `login-1280.png` and `recovery-320.png`; no glass styling or old background illustration remains. This adapts the existing registration/admin design language because there is no dedicated login design reference.
- Those error/recovery browser checks stub the Auth/forgot-password response; they do not verify delivery of a recovery email. The separate real-Supabase full-flow regression passed in 8.2 seconds; the test cleaned up the temporary account/profile/image and checked profile/Auth absence afterwards (`/tmp/hara-login-real-e2e.log`).
- The existing registration E2E test now also asserts the new login heading and captures that page before entering credentials.

Final state for this revision: code, docs, build, 790 unit tests and production browser checks complete. No commit or push. Recovery email delivery and the pre-existing missing ESLint setup remain unverified; no additional service/configuration changes were made.

## Critical-flow audit supersedes test-count readiness claims (2026-11-06)

The user requested real outcome-based coverage. The new plan `docs/plans/2026-11-06-critical-flows-verification.md` records actual delivery evidence, missing flow assertions and reproduced server-validation edge cases. The 790 unit passes and the registration E2E pass must not be treated as proof of mail delivery or full concierge processing. No new business fix is applied before the concrete follow-up plan is approved.

## Final release approval (2026-11-06)

The user approved commit and push after the professional portal follow-up passed all six scenarios in visible Chrome. The approved delivery combines registration/account creation, the four-item public menu, professional login, review/edit restrictions, email access instructions and the portal design. Documentation and verification are complete; git delivery is authorized in the same session. Git command results establish the final commit and remote delivery, rather than a test count. Known mail-delivery, Upstash, reapplication and server-validation limitations remain recorded in ISSUES.md and the deferred critical-flow plan.
