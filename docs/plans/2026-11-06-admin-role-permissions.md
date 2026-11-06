# Role-Based Admin Permissions Implementation Plan

Created: 2026-11-06
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Who can do what is decided by a role stored in the Supabase Auth user (`app_metadata.role`): `admin` gets all of `/admin` and `/api/admin`, `professional` gets `/pro`. The `ADMIN_EMAILS` list goes away, and every admin write action works in production (today Crear match, practice create/edit/discard and PQL adjust return 503 there).

## Out of Scope

- Other roles beyond `admin` and `professional`. The role check reads one string, so a new role later is one more value, not a redesign.
- A public "Entrar" link and the "Soy profesional" pill on the home. That is the next piece of work, after this plan.
- An admin screen to grant roles. Roles are set by the server (invite flow) or by the user in the Supabase SQL editor.

## Approach

**Chosen:** One helper in `lib/admin-auth.ts` reads `user.app_metadata.role`. The middleware uses it to gate routes, and the five admin API routes that used the Clerk-era `getAdminUserId()` call a new `requireAdmin()` that returns the signed-in admin's id.
**Why:** `app_metadata` can only be written with the service role, so a user cannot give themselves admin, and it travels in the session the middleware already loads (no extra query). The cost is one SQL step by the user to mark their own account admin and to backfill existing professionals.

## Context for Implementer

- **The bug this fixes.** `getAdminUserId()` (`lib/admin-auth.ts:6`) returns `{ status: 503 }` whenever `NODE_ENV === 'production'` and a placeholder UUID otherwise. Dev testing never saw it. It is used by `app/api/admin/matches/route.ts:28`, `app/api/admin/pqls/[id]/adjust/route.ts:26` (also as `created_by` at line 74), `app/api/admin/practices/route.ts:92,112`, `app/api/admin/practices/[key]/route.ts:107` and `app/api/admin/practices/dismiss/route.ts:15`.
- **Regression guard (user requirement: "que esto NO vuelva a pasar").** Tests must run the real `requireAdmin()` with `NODE_ENV=production` (`vi.stubEnv`), mocking only the Supabase session, and call each write route as the admin. Any 401, 403 or 503 fails the test. Existing route tests mock the admin helper away, which is exactly how the bug hid, so they are not enough on their own.
- **Who is who.** `user.app_metadata.role === 'admin'` is the admin. `=== 'professional'` is a professional. Anything else (missing role) is neither and gets no protected access. Professionals are linked to their row by `professionals.user_id` (migration 022), set in `lib/pro-invite.ts`.
- **User decision taken without a second question (2026-11-06):** `/pro` is for the `professional` role only. An admin who opens `/pro/*` is sent to `/admin/leads`. Easy to change in the middleware if the user wants admins there too.

## Assumptions

- `updateSession` (`lib/supabase/middleware.ts`) returns the user from `supabase.auth.getUser()`, which includes `app_metadata`. Tasks 1 and 2 depend on this; Task 1 checks it in the first test.
- Supabase Auth keeps `app_metadata` in `auth.users.raw_app_meta_data`, which the SQL editor can update. Task 3's migration and the user's one-time admin SQL depend on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Deploying before the user's account has the admin role locks them out of the live admin | High if order is wrong | High | The final report gives the one-line SQL. The user runs it in Supabase before the push, and I confirm the role through the API (read only) before pushing. |
| Existing professionals lose `/pro` because they have no role yet | High if not backfilled | High | Migration 026 gives `professional` to every auth user linked by `professionals.user_id`. Pushed only after the user runs it. |
| A JWT issued before the role change still carries the old `app_metadata` | Medium | Low | `getUser()` reads the user from Supabase Auth, not from the cookie claims, so the new role applies on the next request. Checked in the production-mode run. |

## E2E Test Scenarios

### TS-001: Admin write actions work in production mode
**Priority:** Critical
**Preconditions:** `npm run build && npm start` on port 3000 (not `npm run dev`). The user's account has `role: admin`.
**Mapped Tasks:** Task 1, Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Sign in at `/admin/login` and open `/admin/leads` | The admin loads |
| 2 | Open `/admin/practices/reiki/edit` and click "Guardar cambios" without changing anything | Back on the list, no error (the PATCH returns 200, not 503) |
| 3 | Call `POST /api/admin/matches` from the page with an empty body | 400 with a validation error, not 503 |
| 4 | Call `POST /api/admin/pqls/{random uuid}/adjust` from the page with a valid body | 404 or 400 from the route itself, not 503 |

### TS-002: A professional cannot get into the admin
**Priority:** Critical
**Preconditions:** Production mode. Covered by middleware unit tests; no real professional password is used in the browser.
**Mapped Tasks:** Task 1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Signed out, open `/admin/leads` | Redirected to `/admin/login` |
| 2 | Signed out, call `GET /api/admin/leads` | Redirected to the login (no data) |

## Progress Tracking

- [x] Task 1: Roles in `lib/admin-auth.ts` and the middleware
- [x] Task 2: The five admin write routes use `requireAdmin()`, with the production-mode guard test
- [x] Task 3: Professionals get the role on invite, plus migration 026 to backfill
- [x] Task 4: Docs, production-mode run, commit and push

## Implementation Tasks

### Task 1: Roles in `lib/admin-auth.ts` and the middleware

**Objective:** Replace `isAdminEmail` with `roleOf(user)` and use it in `middleware.ts`. Admin routes need `admin`, `/pro` routes need `professional`, and `ADMIN_EMAILS` is removed. Verified by TS-002.

**Files:**

- Modify: `lib/admin-auth.ts`, `middleware.ts`, `.env.example`
- Test: `lib/admin-auth.test.ts`, `middleware.test.ts`

**Key Decisions / Notes:**

- `roleOf(user: { app_metadata?: Record<string, unknown> } | null): 'admin' | 'professional' | null`. It reads only `app_metadata.role` and never `user_metadata`, because the user can edit `user_metadata` themselves.
- Middleware rules: `/admin/login` sends an admin to `/admin/leads`. An admin route with a non-admin user gets 403 on `/api/*`, and other paths go to `/admin/login?error=no-access`. A `/pro/*` route (except login and set-password) with an admin user goes to `/admin/leads`, and with no role goes to `/pro/login`. `/pro/login` sends a professional to `/pro/perfil`.
- Delete `isAdminEmail` and the `ADMIN_EMAILS` lines in `.env.example`. Keep the existing "no redirect loop" test for a signed-in non-admin on `/admin/login`.

**Definition of Done:**

- [ ] A user whose `user_metadata.role` is `admin` but has no `app_metadata.role` is NOT treated as admin (test).
- [ ] Professional on `/admin/leads` goes to `/admin/login?error=no-access`. Professional on `/api/admin/leads` gets 403. Admin on `/pro/perfil` goes to `/admin/leads`. Professional on `/pro/perfil` passes (tests in `middleware.test.ts`, run with `NODE_ENV=production`).
- [ ] `git grep -n "ADMIN_EMAILS\|isAdminEmail"` returns nothing outside plans and ISSUES history.
- [ ] Verify: `npx vitest run --project unit middleware.test.ts lib/admin-auth.test.ts`

### Task 2: The five admin write routes use `requireAdmin()`, with the production-mode guard test

**Objective:** Add `requireAdmin()` (reads the user through `createClient()` from `lib/supabase/server.ts`, returns `{ userId }` or `{ error, status }`), delete `getAdminUserId`, and switch the five routes to it. A new guard test calls each of them with `NODE_ENV=production` as an admin and fails on 401, 403 or 503. Verified by TS-001.

**Files:**

- Modify: `lib/admin-auth.ts`, `app/api/admin/matches/route.ts`, `app/api/admin/pqls/[id]/adjust/route.ts`, `app/api/admin/practices/route.ts`, `app/api/admin/practices/[key]/route.ts`, `app/api/admin/practices/dismiss/route.ts`
- Modify (mocks only): `app/api/admin/practices/route.test.ts`, `app/api/admin/practices/[key]/route.test.ts`, `app/api/admin/practices/dismiss/route.test.ts`
- Create: `app/api/admin/admin-auth.production.test.ts`

**Key Decisions / Notes:**

- `requireAdmin()` has no `NODE_ENV` branch. It returns 401 with no user and 403 for a non-admin. The `pqls` adjust route keeps writing `created_by`, now the real admin user id.
- The guard test mocks `@/lib/supabase/server` (session with `app_metadata.role: 'admin'`) and `@/lib/supabase-admin` (returns harmless rows), stubs `NODE_ENV=production`, and for each route sends the smallest valid request. It asserts the status is not 401, 403 or 503, and that `created_by` on the PQL adjustment equals the admin id. A second case per route with a `professional` session asserts 403.
- The guard test lists its routes in one array, with a comment that every new `/api/admin` write route must be added there.

**Definition of Done:**

- [ ] With `NODE_ENV=production` and an admin session, POST matches, POST pqls adjust, POST practices, PATCH practices/[key] and POST practices/dismiss do not return 401, 403 or 503 (guard test).
- [ ] Putting back the old `NODE_ENV === 'production'` 503 branch in `requireAdmin()` makes the guard test fail (mutation check).
- [ ] `git grep -n getAdminUserId` returns nothing in `app/` or `lib/`.
- [ ] Verify: `npx vitest run --project unit app/api/admin lib/admin-auth.test.ts`

### Task 3: Professionals get the role on invite, plus migration 026 to backfill

**Objective:** When `generateProAccessLink` (`lib/pro-invite.ts`) creates or finds the auth user, it sets `app_metadata.role = 'professional'` with `supabaseAdmin.auth.admin.updateUserById`, unless the user is already `admin`. Migration 026 gives the role to every auth user already linked by `professionals.user_id`.

**Files:**

- Modify: `lib/pro-invite.ts`
- Create: `migrations/026_auth_roles.sql`
- Test: `lib/pro-invite.test.ts` (extend the existing file)

**Key Decisions / Notes:**

- Never downgrade an admin. If the user's `app_metadata.role` is already `admin`, leave it. Keep the rest of `app_metadata` (merge, do not replace).
- Migration 026: `UPDATE auth.users SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"professional"}' WHERE id IN (SELECT user_id FROM professionals WHERE user_id IS NOT NULL) AND coalesce(raw_app_meta_data->>'role','') <> 'admin';` in a transaction, with rollback notes. The user runs it in the SQL editor.
- The user's own admin line is NOT committed (it holds their email). It goes in the final report.

**Definition of Done:**

- [ ] The invite sets `role: 'professional'` and keeps other `app_metadata` keys (test asserts the `updateUserById` payload).
- [ ] An existing admin user is not changed by the invite (test).
- [ ] Verify: `npx vitest run --project unit lib/pro-invite`

### Task 4: Docs, production-mode run, commit and push

**Objective:** Update the docs that mention `ADMIN_EMAILS`, run TS-001 on a production build, then commit and push together with `ef13ca2` once the user has run the admin SQL and migration 026.

**Files:**

- Modify: `CLAUDE.md`, `ISSUES.md`, `.claude/plans/hara.md`

**Key Decisions / Notes:**

- `Trivial:` docs only, plus the verification run.
- Before pushing, confirm through the Supabase API (read only, service key, no values printed) that the user's account has `app_metadata.role = 'admin'`.

**Definition of Done:**

- [ ] TS-001 passes against `npm run build && npm start`, not `npm run dev`.
- [ ] `git status --short` is empty after the commit, and `git push` succeeds.
- [ ] Verify: `npx tsc --noEmit && npx vitest run --project unit && npm run build`

## E2E Results

Run against a production build (`npm run build` + `npm start`, port 3000), not `npm run dev`. Admin role confirmed on the user's account through the Supabase admin API (read only) after the user ran the admin SQL and migration 026.

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | PASS | 0 | Signed in as admin: GET practices ok, PATCH practices/reiki with its own label 200, POST matches {} 400, POST practices {} 400, POST practices/dismiss {} 400, POST pqls/{zero uuid}/adjust 404. None returned 401, 403 or 503 |
| TS-002 | Critical | PASS | 0 | Signed out: /admin/leads, /api/admin/leads, /api/admin/matches go to /admin/login; /pro/perfil goes to /pro/login. Professional cases covered by middleware tests (no professional has a login yet) |

Unit: 765 tests pass, `tsc` clean, production build passes. Guard `app/api/admin/admin-auth.production.test.ts` fails 19 of 19 when the old production 503 is put back.
