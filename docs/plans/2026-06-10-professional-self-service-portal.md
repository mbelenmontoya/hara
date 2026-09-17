# Professional Self-Service Portal Implementation Plan

Created: 2026-06-10
Author: belu.montoya@dialpad.com
Agent: Claude Code
Status: COMPLETE
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** An approved professional receives a "set your password" link inside their existing approval email, logs in at `/pro/login` (with a forgot-password recovery path), and fully edits their own profile at `/pro/perfil` — with a read-only Hara score panel that updates live as they complete fields. Admin can re-send the access link. No admin involvement per edit.

## Out of Scope

- **Email change from the portal.** `email` is the auth identity and stays read-only (decided 2026-06-10). All other profile fields are editable.
- **`/pro` dashboard and `/pro/leads`.** Login redirects straight to `/pro/perfil`. The dashboard + leads views remain Phase 3.
- **Re-moderation on edit.** Edits by an `active` pro go live immediately; status does not flip back to `submitted` (decided 2026-06-10).
- **Concurrent-edit conflict resolution.** Single owner per row, last-write-wins. Two-tab simultaneous edits are not reconciled.
- **Pro-initiated account deletion.** Not in this phase.

## Approach

**Chosen:** Extend the existing Supabase-Auth + Resend stack — add `professionals.user_id`, generate access links with `supabaseAdmin.auth.admin.generateLink` (no Supabase-sent email), deliver them through our own Resend templates, and reuse `calculateProfileScore` + the registration field components for the edit form.

**Why:** It reuses every existing primitive (admin login pattern, `@supabase/ssr` cookie middleware, `uploadProfileImage`, `PracticePicker`/`SpecialtySelector`/`PlacesAutocomplete`, the pure `calculateProfileScore`) and keeps all email branded through Resend. The cost is one schema migration and one new auth callback page. We deliberately avoid Supabase's built-in `resetPasswordForEmail` because it sends generic, rate-limited mail from Supabase's SMTP rather than our verified Resend domain.

## Context for Implementer

The access-link mechanism is the load-bearing piece. `supabaseAdmin.auth.admin.generateLink({ type, email, options })` creates the auth user (for `invite`) or requires it to exist (for `recovery`) and returns `{ data: { properties: { hashed_token, action_link, ... }, user }, error }` **without sending any email**. We ignore `action_link` (its redirect mechanics are flow-type-dependent and not SSR-friendly) and instead build our own callback URL `/pro/set-password?token_hash=<hashed_token>&type=<invite|recovery>`. The callback page calls `supabase.auth.verifyOtp({ token_hash, type })` to establish a cookie session (via the `@supabase/ssr` browser client, so the SSR middleware sees it), then `supabase.auth.updateUser({ password })`. This single pattern serves both the approval invite and the forgot-password recovery — only the `type` differs.

Ownership is enforced at the data layer, not just middleware: middleware confirms a user is *logged in*; the `/pro/perfil` page and `/api/pro/profile` route resolve the professional by `user_id = session.user.id` and operate only on that row. An admin (also Supabase-authenticated) has no professional row for their `user_id`, so they get a "no profile" path, never another pro's data.

## Assumptions

- Migration 022 (`professionals.user_id`) is applied to Supabase before Tasks 2–8 are exercised against a live DB. Like prior migrations, Bel applies it via the SQL Editor. Tasks 1's code and unit tests do not require it applied; live E2E does.
- `supabaseAdmin` (service-role client) is authorized to call `auth.admin.generateLink`. The service role key in `lib/supabase-admin.ts` has admin auth scope (same key already used for all privileged ops).

## Goal Verification

### Truths

1. An approved professional can complete the full path — approval email → set password → log in → edit and save a profile field — with zero admin steps in between, and the change is visible on their public `/p/[slug]` profile.
2. The Hara score panel on `/pro/perfil` rises and falls live as the professional edits fields, and the value it shows for the saved state equals `calculateProfileScore` of that saved data (no admin `score_overrides` applied in the live view).
3. A logged-in professional can only ever read and write their own professional row; an unauthenticated visitor to `/pro/perfil` is redirected to `/pro/login`, and an authenticated non-pro (e.g. admin) never sees another professional's editable data.

## E2E Test Scenarios

### TS-001: Approval invite → set password → land on portal
**Priority:** Critical
**Preconditions:** A `submitted` professional exists; admin is logged in.
**Mapped Tasks:** Task 1, Task 2, Task 5, Task 7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Admin approves the professional at `/admin/professionals/[id]/review` | Status flips to `active`; approval email is sent containing a "Configurá tu acceso" button |
| 2 | Open the set-password link `/pro/set-password?token_hash=…&type=invite` (captured from the generated link) | Page verifies the token and shows a new-password form |
| 3 | Enter a valid password + confirmation, submit | Redirected to `/pro/perfil`; the professional's own profile loads |

### TS-002: Login happy path + wrong-password error
**Priority:** Critical
**Preconditions:** A professional who has set a password exists.
**Mapped Tasks:** Task 3, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/pro/login`, enter wrong password, submit | Inline error "Email o contraseña incorrectos"; stays on `/pro/login` |
| 2 | Enter correct email + password, submit | Redirected to `/pro/perfil` |
| 3 | While logged in, navigate to `/pro/login` directly | Redirected to `/pro/perfil` (already authenticated) |

### TS-003: Forgot password sends branded recovery link
**Priority:** High
**Preconditions:** None.
**Mapped Tasks:** Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On `/pro/login`, open "¿Olvidaste tu contraseña?", enter any email, submit | Generic success message ("Si hay una cuenta…") shown regardless of whether the email exists (no enumeration) |
| 2 | For a real pro email, open the recovery link `/pro/set-password?token_hash=…&type=recovery` | Password form shown; submitting a new password logs them in and lands on `/pro/perfil` |

### TS-004: Edit profile, watch live score, persist
**Priority:** Critical
**Preconditions:** Logged-in professional with an incomplete profile.
**Mapped Tasks:** Task 6, Task 7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On `/pro/perfil`, note the current Hara score | Score panel shows current total + per-criterion breakdown |
| 2 | Type a longer `short_description` (cross a scoring tier) | Score panel total increases live, before saving |
| 3 | Click "Guardar cambios" | Success confirmation; no full-page error |
| 4 | Reload `/pro/perfil` | The edited value persists and the score reflects the saved state |

### TS-005: Access control
**Priority:** High
**Preconditions:** Two professionals A and B; A is logged in.
**Mapped Tasks:** Task 3, Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log out, navigate to `/pro/perfil` | Redirected to `/pro/login` |
| 2 | Log in as A, attempt `POST /api/pro/profile` aimed at B's data | A's own row is what updates; B's row is never modified (route ignores any client-supplied id and resolves by session `user_id`) |

### TS-006: Admin re-sends access link
**Priority:** Medium
**Preconditions:** An `active` professional (e.g. approved before this feature, no `user_id` yet); admin logged in.
**Mapped Tasks:** Task 8

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On `/admin/professionals/[id]/review`, click "Reenviar acceso" | Confirmation shown; access email re-sent with a fresh link; `user_id` now populated |

## Progress Tracking

- [x] Task 1: Add `professionals.user_id` migration + `generateProAccessLink` helper
- [x] Task 2: Wire invite link into approval email + approve handler
- [x] Task 3: Gate `/pro/*` and `/api/pro/*` in middleware
- [x] Task 4: `/pro/login` + forgot-password API + recovery email
- [x] Task 5: `/pro/set-password` callback page
- [x] Task 6: `/api/pro/profile` self-edit save endpoint
- [x] Task 7: `/pro/perfil` edit form + live Hara score panel
- [x] Task 8: Admin "Reenviar acceso" button + route

## Implementation Tasks

### Task 1: Add `professionals.user_id` migration + `generateProAccessLink` helper

**Objective:** Establish the auth-binding foundation. Add a `user_id` column linking a professional to a Supabase Auth user, and a helper that generates a branded access link (invite or recovery) without sending Supabase's own email, writing back `user_id` on first creation. Verified by TS-001 and TS-006.

**Files:**

- Create: `migrations/022_professional_user_id.sql`
- Create: `lib/pro-invite.ts`
- Test: `lib/pro-invite.test.ts`

**Key Decisions / Notes:**

- Migration: `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;` plus `CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_user_id ON professionals(user_id) WHERE user_id IS NOT NULL;` (one auth user ↔ one professional; deleting the auth user nulls the link, never deletes the pro). Idempotent. Add a header comment with the rollback (`DROP INDEX … ; ALTER TABLE … DROP COLUMN user_id;`).
- `generateProAccessLink({ email, professionalId }): Promise<{ setupUrl: string; kind: 'invite' | 'recovery' } | null>`: call `supabaseAdmin.auth.admin.generateLink({ type: 'invite', email })`; if it errors because the user already exists, retry with `{ type: 'recovery', email }`. On success, read `data.properties.hashed_token` and `data.user?.id`; if `user.id` present, write it to `professionals.user_id` for `professionalId` (only when currently null — avoid clobbering). Build `setupUrl = \`${emailBaseUrl()}/pro/set-password?token_hash=${hashed_token}&type=${kind}\``. Return `null` on total failure (caller treats as non-blocking).
- Reuse the base-URL resolver: export `emailBaseUrl` from `lib/email.ts` (currently module-private at `lib/email.ts:32`) and import it in `lib/pro-invite.ts` — do NOT duplicate the resolver. One source of truth.
- **Field-name asymmetry (bug trap):** the `generateLink` response property is `data.properties.hashed_token` (Supabase naming), but the URL query param and the `verifyOtp` argument (Task 5) are both named `token_hash`. They are the same value with different names on either side of the wire. Read it as `const token_hash = data.properties.hashed_token` and build `…?token_hash=${token_hash}&type=${kind}`. Reading `data.properties.token_hash` (does not exist) yields `undefined` in the link.

**Definition of Done:**

- [ ] `generateProAccessLink` returns an `invite` link for a new email and a `recovery` link when invite reports the user already exists
- [ ] On success it writes `user_id` to the professional row only when it was null
- [ ] Returns `null` (no throw) when `generateLink` fails for both types
- [ ] `emailBaseUrl` is exported from `lib/email.ts` and imported by `lib/pro-invite.ts` (not a local copy)
- [ ] Migration file is idempotent and carries a rollback comment
- [ ] Verify: `npm run test:integration -- lib/pro-invite.test.ts` (or `npx vitest run lib/pro-invite.test.ts`)

### Task 2: Wire the access link into the approval email + approve handler

**Objective:** When admin approves a professional, generate the access link and embed it in the existing approval email as a "Configurá tu acceso" CTA — one email, not a separate one. The email gracefully falls back to the current "escribinos" copy if link generation fails. Verified by TS-001.

**Files:**

- Modify: `lib/email.ts`
- Modify: `app/api/admin/professionals/[id]/route.ts`
- Test: `app/api/admin/professionals/[id]/route.test.ts`

**Key Decisions / Notes:**

- `notifyProfessionalApproved` (`lib/email.ts:261`): add optional `setupUrl?: string`. Replace the "¿Querés actualizar algo? … escribinos a …" section (`lib/email.ts:310-315`) with a branded button linking to `setupUrl` ("Configurá tu acceso para editar tu perfil cuando quieras"). When `setupUrl` is absent, keep the existing fallback copy. Reuse the existing button styling (`lib/email.ts:286-291`).
- Approve handler (`app/api/admin/professionals/[id]/route.ts:212-245`): after the status→`active` update succeeds, `await generateProAccessLink({ email: existing.email, professionalId: id })` (await here — we need `setupUrl` for the email; this call is the one part that may block briefly, but it's bounded and only on approval). Pass `setupUrl` (or `undefined`) into `notifyProfessionalApproved`. Keep the email itself fire-and-forget.
- Update `route.test.ts`: add `vi.mock('@/lib/pro-invite', () => ({ generateProAccessLink: vi.fn().mockResolvedValue({ setupUrl: 'https://x/pro/set-password?token_hash=h&type=invite', kind: 'invite' }) }))`; the existing approve assertion (`route.test.ts:150`) changes to expect `setupUrl` in the `notifyProfessionalApproved` payload.
- `lib/email.test.ts` asserts on `notifyProfessionalApproved` — update its assertions to cover BOTH the new `setupUrl` CTA branch and the fallback (no `setupUrl`) branch.

**Definition of Done:**

- [ ] Approving fires `notifyProfessionalApproved` with the generated `setupUrl`
- [ ] Approval still returns 200 when `generateProAccessLink` resolves `null` (email sent with fallback copy)
- [ ] Approval still returns 200 when the email send rejects (fire-and-forget preserved)
- [ ] `lib/email.test.ts` covers both the `setupUrl` CTA branch and the no-`setupUrl` fallback branch
- [ ] Verify: `npx vitest run "app/api/admin/professionals/[id]/route.test.ts" lib/email.test.ts`

### Task 3: Gate `/pro/*` and `/api/pro/*` in middleware

**Objective:** Extend the auth middleware so portal pages and APIs require a session, while keeping the login, set-password, and forgot-password endpoints public. Mirrors the existing `/admin` gating. Verified by TS-005.

**Files:**

- Modify: `middleware.ts`
- Test: `middleware.test.ts`

**Key Decisions / Notes:**

- ⛔ **Prefix-collision bug:** `pathname.startsWith('/pro')` ALSO matches the public `/profesionales` directory and `/profesionales/registro` — gating them behind auth would break public browse + registration. Use the trailing slash: `pathname.startsWith('/pro/')` and `pathname.startsWith('/api/pro/')` for `isProtectedRoute` (`middleware.ts:16`). There is no bare `/pro` route this phase, so the trailing-slash form covers everything.
- Public exceptions (return `response` without redirect): exact `/pro/login`, `/pro/set-password`, and `/api/pro/forgot-password`. `/pro/set-password` MUST be public — the initial GET has no session; `verifyOtp` establishes it client-side.
- On `/pro/login` with an existing `user`: redirect to `/pro/perfil` (parallel to the admin-login redirect at `middleware.ts:22-28`).
- Protected `/pro/*` without a session → redirect to `/pro/login?redirect=<pathname>`. Protected `/api/pro/*` without a session → the existing redirect is acceptable (the route's own ownership check is the real guard); keep behavior parallel to `/api/admin`.
- Test mocks `@/lib/supabase/middleware`'s `updateSession` to return `{ response, user }` and asserts: unauthenticated `/pro/perfil` → 307 to `/pro/login`; authenticated `/pro/login` → 307 to `/pro/perfil`; `/pro/set-password` and `/api/pro/forgot-password` pass through unauthenticated; AND `/profesionales` + `/profesionales/registro` are NOT redirected by the new guard (regression guard for the prefix collision).

**Definition of Done:**

- [ ] Unauthenticated `/pro/perfil` redirects to `/pro/login`
- [ ] Authenticated visit to `/pro/login` redirects to `/pro/perfil`
- [ ] `/pro/set-password` and `/api/pro/forgot-password` are reachable without a session
- [ ] `/profesionales` and `/profesionales/registro` are NOT gated by the new guard (prefix-collision regression test)
- [ ] Verify: `npx vitest run middleware.test.ts`

### Task 4: `/pro/login` page + forgot-password API + recovery email

**Objective:** Build the professional login page (email + password, mirroring admin login) with a "forgot password" path that POSTs to a rate-limited API which emails a branded recovery link via Resend. Verified by TS-002 and TS-003.

**Files:**

- Create: `app/pro/login/page.tsx`
- Create: `app/api/pro/forgot-password/route.ts`
- Modify: `lib/email.ts`
- Test: `app/api/pro/forgot-password/route.test.ts`

**Key Decisions / Notes:**

- Login page: mirror `app/admin/login/page.tsx` (`createClient()` browser client, `signInWithPassword`, `Suspense`, `useSearchParams` redirect default `/pro/perfil`, PageBackground + GlassCard). Spanish copy for professionals ("Ingresá a tu perfil"). Add a collapsible "¿Olvidaste tu contraseña?" that reveals an email input → POST `/api/pro/forgot-password`.
- `lib/email.ts`: add `notifyProPasswordReset({ to, full_name?, setupUrl })` — a small branded template ("Restablecé tu contraseña") with the CTA button to `setupUrl`. Distinct from the approval email semantically.
- `/api/pro/forgot-password`: rate-limit with `ratelimit` from `lib/rate-limit.ts` keyed by IP (pattern in `.claude/rules/api-routes.md`). Always respond with a generic success message — never reveal whether the email exists. `runtime = 'nodejs'`.
- **Lookup must be status-scoped:** query `professionals` by `email` with `status = 'active'` (`select('id').eq('email', email).eq('status', 'active').maybeSingle()`). Only an `active` pro gets a recovery link — a `submitted` or `rejected` account must NOT be able to set a password (it was never approved). If no active pro is found, skip silently (still return generic success). Pass the resolved `id` as `professionalId` to `generateProAccessLink` (it needs it for the `user_id` write-back); never call it with an undefined id.
- No user enumeration: identical response and status whether or not the email maps to an active pro.

**Definition of Done:**

- [ ] Wrong credentials show an inline error and stay on `/pro/login`
- [ ] `/api/pro/forgot-password` returns the same generic success for known, unknown, and non-active emails
- [ ] A `submitted`/`rejected` professional's email returns 200 but does NOT send an email (assert `notifyProPasswordReset` not called)
- [ ] `/api/pro/forgot-password` is rate-limited and sends `notifyProPasswordReset` only for an `active` professional
- [ ] Verify: `npx vitest run "app/api/pro/forgot-password/route.test.ts"`

### Task 5: `/pro/set-password` callback page

**Objective:** Build the public callback page that consumes a `token_hash`+`type` link (from approval invite or recovery email), establishes a session via `verifyOtp`, lets the professional set a password, and lands them on `/pro/perfil`. Verified by TS-001 and TS-003.

**Files:**

- Create: `app/pro/set-password/page.tsx`
- Test: `app/pro/set-password/page.test.tsx`

**Key Decisions / Notes:**

- Client component wrapped in `Suspense` (uses `useSearchParams`). Read `token_hash` and `type` (`'invite' | 'recovery'`) from query.
- On mount: `await supabase.auth.verifyOtp({ token_hash, type })` via the browser client (`@/lib/supabase/client`). On error → render an "enlace inválido o vencido" state with a link back to `/pro/login` and the forgot-password path. On success → show the password form (new password + confirmation, min length check, match check).
- Submit: `await supabase.auth.updateUser({ password })`; on success `router.push('/pro/perfil')` + `router.refresh()`.
- Reuse PageBackground + GlassCard + the input/button styling from the admin login page for visual consistency.
- Test (component): mock `@/lib/supabase/client` so `verifyOtp` resolves error → asserts the invalid-link state renders; password mismatch → inline validation error (no `updateUser` call). Also assert `type` forwarding: with `?type=invite`, `verifyOtp` is called with `{ token_hash, type: 'invite' }`; with `?type=recovery`, with `{ token_hash, type: 'recovery' }`. The `type` must come from the URL param, never hardcoded — a hardcoded `'invite'` silently breaks every recovery link (TS-003). One component test class.

**Definition of Done:**

- [ ] Invalid/expired token shows the recovery-path error state, not the password form
- [ ] Password + mismatched confirmation blocks submit with an inline error
- [ ] `verifyOtp` is called with the `type` taken from the URL param (asserted for both `invite` and `recovery`)
- [ ] Successful set calls `updateUser({ password })` and navigates to `/pro/perfil`
- [ ] Verify: `npx vitest run "app/pro/set-password/page.test.tsx"`

### Task 6: `/api/pro/profile` self-edit save endpoint

**Objective:** Build the authenticated endpoint that lets a professional update their own row. It resolves the professional by the session user's `user_id`, validates input (reusing registration rules), handles image upload, and never touches `email` or another pro's row. Verified by TS-004 and TS-005.

**Files:**

- Create: `app/api/pro/profile/route.ts`
- Test: `app/api/pro/profile/route.test.ts`

**Key Decisions / Notes:**

- `runtime = 'nodejs'`. Get the session user via the server client (`@/lib/supabase/server` → `supabase.auth.getUser()`). If no user → 401. Resolve the professional with `supabaseAdmin.from('professionals').select('id').eq('user_id', user.id).maybeSingle()`. If none → 403 ("No tenés un perfil asociado") — this is the admin/non-pro path.
- Accept `multipart/form-data` mirroring the registration parser (`app/api/professionals/register/route.ts:42-75`): same editable fields (full_name, whatsapp, instagram, country/city/lat/lng, online_only, modality, specialties, practices, service_type, price_range_*, currency, accepting_new_clients, short_description, bio, experience_description) + optional `profile_image`. **Ignore any `email` field** — never write it.
- Reuse validators: WhatsApp (E.164), `validatePracticeKeys`, non-empty modality/specialties, bio min length. Image via `uploadProfileImage(file, professional.id)`. Write only the resolved `id`; ignore any client-supplied id. Set `updated_at`. Status is NOT changed (stays `active`).
- The write uses `supabaseAdmin` (service role) but only after ownership is proven by the `user_id` lookup — consistent with the rest of the codebase using `supabaseAdmin` for writes.

**Definition of Done:**

- [ ] No session → 401; authenticated non-pro → 403; never updates a row not owned by the session user
- [ ] A client-supplied `email` (or `id`) is ignored — `email` is never written
- [ ] Invalid WhatsApp / empty practices / oversized image are rejected with 400 and a Spanish message
- [ ] Valid payload updates the owner's row and returns success
- [ ] Verify: `npx vitest run "app/api/pro/profile/route.test.ts"`

### Task 7: `/pro/perfil` edit form + live Hara score panel

**Objective:** Build the professional's profile page: a single editable form (all fields, one "Guardar cambios" button) pre-filled from their row, plus a read-only Hara score panel that recomputes live from the in-progress form state. Verified by TS-004.

**Files:**

- Create: `app/pro/perfil/page.tsx`
- Create: `app/pro/perfil/ProfileEditForm.tsx`
- Test: `app/pro/perfil/ProfileEditForm.test.tsx`

**Key Decisions / Notes:**

- `page.tsx` (server component): resolve session user via `@/lib/supabase/server`; load the professional by `user_id` via `supabaseAdmin`; if none, render a friendly "no tenés un perfil" message (don't crash). Fetch the practices catalog with `getActivePractices()` (pattern in `app/profesionales/page.tsx`). Pass professional + practices to `ProfileEditForm`.
- `ProfileEditForm.tsx` (`'use client'`): single flat form with sections (not the 4-step wizard). Reuse `PracticePicker`, `SpecialtySelector`, `PlacesAutocomplete`, and the WhatsApp/Instagram handlers from `RegistroForm.tsx` (lift shared handlers or copy the small pure ones). `email` rendered read-only/disabled. Submit builds `FormData` and POSTs to `/api/pro/profile`; show success + error states.
- **Live score panel:** `useMemo` mapping current form state → `ScorableProfile` → `calculateProfileScore(profile)` (NO overrides — honest pro-facing feedback). Reuse `ScoreRing` + `ScoreBreakdown` from `app/admin/professionals/[id]/review/components/ScoreDisplay.tsx`. ⛔ `ScoreBreakdown` renders editable number inputs when its optional `onOverride` prop is passed (`ScoreDisplay.tsx:99,102,106-116`) — pass it `breakdown={score.breakdown}` and NO `onOverride`. To make read-only structural rather than a convention, wrap it in a small `ReadOnlyScorePanel` (in this feature) that renders `<ScoreRing>` + `<ScoreBreakdown breakdown={...} />` and never accepts/forwards `onOverride`. Point overrides stay admin-only.
- Performance: the score `useMemo` recomputes only when scored fields change; `calculateProfileScore` is pure and cheap. No network call for the live score.
- Test (component): render with a partial profile, assert the score panel shows the initial total; type into `short_description` crossing a tier, assert the displayed total increases without a save; assert "Guardar" triggers a POST to `/api/pro/profile` (mock `fetch`); assert the score panel exposes NO editable override input (the `onOverride`-driven input is absent). One component test class.

**Definition of Done:**

- [ ] Form pre-fills from the professional's row; `email` is visible but not editable
- [ ] The Hara score panel total changes live as a scored field crosses a tier, before saving
- [ ] The score panel is read-only — no override input is rendered (no `onOverride` passed)
- [ ] "Guardar cambios" POSTs the full form to `/api/pro/profile` and surfaces success/error
- [ ] Verify: `npx vitest run "app/pro/perfil/ProfileEditForm.test.tsx"`

### Task 8: Admin "Reenviar acceso" button + route

**Objective:** Let admin re-send a fresh access link from the review page — for pros approved before this feature (no `user_id`) or who lost their link. Verified by TS-006.

**Files:**

- Create: `app/api/admin/professionals/[id]/invite/route.ts`
- Modify: `app/admin/professionals/[id]/review/page.tsx`
- Test: `app/api/admin/professionals/[id]/invite/route.test.ts`

**Key Decisions / Notes:**

- `POST /api/admin/professionals/[id]/invite` (admin-gated by existing middleware, `runtime='nodejs'`): load the pro (`id, email, full_name, slug`); call `generateProAccessLink({ email, professionalId: id })`; on success re-send `notifyProfessionalApproved({ to, full_name, slug, setupUrl })` (reuse the approval template — honors "same email, don't complicate"). Return 200 with the `kind`; 404 if the pro doesn't exist; 502/500 if link generation fails (so admin sees it didn't send).
- Review page: add a "Reenviar acceso" `Button` near the existing approve/reject actions; POST to the new route; show an `Alert` on success/failure. Only meaningful for non-`submitted` (already-decided) pros — show it for `active` status.

**Definition of Done:**

- [ ] Clicking "Reenviar acceso" re-sends the approval email with a fresh link and populates `user_id` if it was null
- [ ] Route returns 404 for a missing pro and a non-200 when link generation fails
- [ ] Verify: `npx vitest run "app/api/admin/professionals/[id]/invite/route.test.ts"`

## Open Questions

None — the four design decisions (email locked, edits go live, login+profile scope, single-save) were resolved with the user on 2026-06-10.
