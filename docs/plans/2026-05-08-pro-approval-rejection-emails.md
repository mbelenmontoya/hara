# Pro Approval/Rejection Emails Implementation Plan

Created: 2026-05-08
Author: belu.montoya@dialpad.com
Status: VERIFIED
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Close the pro-side communication loop on registration outcomes. Send three emails (submission confirmation, approval, rejection-with-cooldown) and enforce a 60-day re-application cooldown on the registration endpoint.

**Architecture:** Three new exported functions in `lib/email.ts` mirror the existing `notifyReviewRequest` pro-facing pattern. The registration handler gains a pre-insert cooldown check and a post-insert confirmation email. The admin PATCH route gains email firing on approve/reject and sets `resubmit_after = NOW() + 60 days` on reject. Migration 011 adds the `resubmit_after TIMESTAMPTZ` column and replaces the unconditional `UNIQUE` constraint on `professionals.email` with a partial UNIQUE index that excludes `rejected` rows — preserving the "old row stays in DB" history that Flow 5 of the PRD relies on.

**Tech Stack:** Next.js 14.2 API routes (Node runtime), Supabase service-role client, Resend for email, Vitest (unit + integration), Argentine Spanish copy.

## Scope

### In Scope

- Three new email functions in `lib/email.ts`:
  - `notifyRegistrationReceived(professional)` — Flow 1
  - `notifyProfessionalApproved(professional)` — Flow 2
  - `notifyProfessionalRejected(professional, rejection_reason, resubmit_after)` — Flow 3
- Unit tests for the three new email functions in `lib/email.test.ts` (new file).
- `migrations/011_pro_resubmit_cooldown.sql`:
  - **Defensive schema-sync (covers prior out-of-band changes applied via `scripts/migrate-review-flow.mjs`):**
    - `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS rejection_reason TEXT`.
    - `ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_status_check`, then `ADD CONSTRAINT professionals_status_check CHECK (status IN ('draft','submitted','approved','active','paused','rejected'))`.
    - Idempotent: matches the SQL `scripts/migrate-review-flow.mjs:50-52` already prescribes for the operator to paste.
  - **Item 3 additions:**
    - `ALTER TABLE professionals ADD COLUMN resubmit_after TIMESTAMPTZ NULL`.
    - `ALTER TABLE professionals DROP CONSTRAINT professionals_email_key` (verify constraint name first).
    - `CREATE UNIQUE INDEX professionals_email_active_unique ON professionals (email) WHERE status != 'rejected'`.
    - `CREATE INDEX professionals_email_idx ON professionals (email)` so cooldown lookups stay fast across all statuses.
  - Reversible rollback documented in header comment, mirroring migration 010 pattern.
- `app/api/professionals/register/route.ts`:
  - Pre-insert cooldown check by email (`status='rejected' AND resubmit_after > NOW()`) — return 403 with `{ error, resubmit_after, previous_application_at }` where `error` is the **fully-composed Spanish message** with both dates pre-formatted (no client-side date formatting required — keeps the change contained to the API).
  - Post-insert fire-and-forget `notifyRegistrationReceived`.
- `app/api/admin/professionals/[id]/route.ts`:
  - In the reject branch: write `resubmit_after = NOW() + INTERVAL '60 days'` alongside the status flip, then fire `notifyProfessionalRejected`.
  - In the approve branch: fire `notifyProfessionalApproved`.
  - Both fire-and-forget (`.catch(() => {})`) — email failure must not block status update.
- `app/admin/professionals/[id]/review/page.tsx`:
  - Modal intro copy (currently *"El profesional podrá verlo si le comunicamos la decisión."*) updated to make verbatim-pro-facing semantics explicit per Flow 6.
- Integration test `__tests__/integration/cooldown-enforcement.test.ts` covering: re-apply within window blocked, re-apply after window allowed, no prior rejection passes through.
- Two new unit tests in `app/api/admin/professionals/[id]/route.test.ts` covering the PATCH approve/reject branches: (a) approve fires `notifyProfessionalApproved` with `{ to, full_name, slug }`, (b) reject writes `resubmit_after` and fires `notifyProfessionalRejected` with `{ to, full_name, rejection_reason, resubmit_after }`. Existing PATCH branches currently have **zero** unit coverage (route.test.ts is DELETE-only); these tests are net-new, not "updated."

### Out of Scope

- Multi-touch onboarding sequence (Phase 1+).
- "Compartí tu perfil" CTA in approval email (PRD: voice mismatch).
- Self-edit `/pro` portal (Phase 3).
- Category-based rejection reason dropdown (PRD: admin keeps freeform control).
- Auto-firing approval email when admin manually un-rejects (`rejected → active`). Admin re-triggers manually if needed.
- Cleanup of `notifyNewProfessional`'s outdated `specialties: string[]` typing (separate housekeeping).

## Approach

**Chosen:** Drop-in additive — three new email functions mirroring `notifyReviewRequest`'s pro-facing pattern, plus targeted edits to the registration and admin PATCH handlers and a single forward-only migration. No template-engine introduction, no shared HTML helper extraction.

**Why:** The existing email functions (4 total) duplicate the same `<div style="font-family: …">` scaffold, so a helper would be reasonable. But (1) the PRD explicitly says "no new dependencies, no template engine," (2) the project's `USE → IMPROVE → ADD` discipline says to extend existing patterns before abstracting, and (3) refactoring the four existing functions to use a shared helper widens the diff and risks regressions on already-shipped emails (`notifyNewLead`, `notifyNewProfessional`, `notifyReviewRequest`). The cost of three more inline email functions is acceptable; the cost of a refactor that breaks a working production email is not. If a fifth email lands, revisit the helper extraction then.

**Alternatives considered:**

- **Helper extraction (`emailScaffold(content) → string`):** Reduces duplication but requires touching all four existing emails to pass through the helper, expanding the surface area of this change. Deferred until ≥5 emails exist.
- **React Email package:** Industry-standard but introduces a build-time dependency and a parallel rendering pipeline. PRD rules it out explicitly.
- **Update-in-place re-application instead of partial UNIQUE:** Simpler migration (no UNIQUE drama) but loses the prior rejection_reason as a separate row. PRD's stated intent ("old row stays in DB for admin history") favors keeping the row.
- **Drop UNIQUE entirely:** Simplest migration but kills the "at most one live pro per email" invariant and turns the dup-email guard at `register/route.ts:183` into dead code. Partial UNIQUE preserves the invariant on non-rejected rows specifically.

## Context for Implementer

> Implementer note: read this section before touching code. Several patterns are non-obvious and the migration touches a constraint with knock-on effects.

### Patterns to follow

- **Pro-facing email shape:** `lib/email.ts:162` (`notifyReviewRequest`). Single-CTA, max-width 560px, system-ui font, brand color `#4B2BBF`, pillar buttons (`border-radius: 9999px; padding: 14px 28px`), color tokens `#1F1A24` primary / `#6B6374` muted.
- **Admin-facing email shape:** `lib/email.ts:104` (`notifyNewProfessional`). Table-driven, 500px. **Do NOT mirror this for the new pro-facing emails.**
- **Base URL pattern:** ⚠️ The existing pattern at `lib/email.ts:113-115` has an operator-precedence bug: `process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL ? \`https://${VERCEL_URL}\` : 'http://localhost:3000'` parses as `(A || B) ? X : Y` — so `NEXT_PUBLIC_SITE_URL` is read but never used in the resulting URL. **Do NOT mirror it.** Task 2 introduces a small `emailBaseUrl()` helper with the correct precedence: `process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? \`https://${process.env.VERCEL_URL}\` : 'http://localhost:3000')`. The helper replaces the inline pattern at line 113-115 as part of this PR (one-line refactor, four callers benefit).
- **Fire-and-forget pattern:** `app/api/professionals/register/route.ts:210-217` — `notifyXxx(...).catch(() => {})`. Status update must complete before the email; email failure must not block the response.
- **Migration structure:** `migrations/010_holistic_practices_catalog.sql` — wrap in `BEGIN; ... COMMIT;`, sequential numbered sections, rollback statements documented in header comment.
- **Unit test placement:** Alongside source file (`lib/practices.test.ts` next to `lib/practices.ts`), NOT in `__tests__/lib/`.
- **Integration test pattern:** `__tests__/integration/practices-migration.test.ts:1-15` — `dotenv` config from `.env.local`, service-role client, real DB.

### Conventions

- All user-facing strings in Argentine Spanish (vos, querés, escribís).
- All copy literals in this feature must match the PRD's *Draft email copy* section verbatim unless Bel updates the plan.
- Error logging: `lib/monitoring.ts` (`logError`), not `console.log`. `console.error` is acceptable in `lib/email.ts` because that file already uses it for Resend failures and Bel's pattern there is consistent.
- `resubmit_after` displayed in copy as full Spanish date (*"15 de julio de 2026"*) — use `toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })`. Pattern reference: `app/admin/professionals/[id]/review/page.tsx:198-202`.

### Key files

- `lib/email.ts` — three new exports added at the bottom.
- `app/api/professionals/register/route.ts` — cooldown check inserted between validation and slug generation; confirmation email after the existing admin notify.
- `app/api/admin/professionals/[id]/route.ts` — reject branch (line 171–193) and approve branch (line 195–214) gain email firing.
- `app/admin/professionals/[id]/review/page.tsx` — only the Reject modal intro copy at line 419–422 changes.
- `migrations/011_pro_resubmit_cooldown.sql` — new file.

### Gotchas

- The unconditional `UNIQUE` on `professionals.email` from `migrations/001_schema.sql:14` is named `professionals_email_key` by Postgres convention. Verify the actual constraint name with `\d professionals` before writing the DROP statement.
- `professionals.email_key` is also the implicit index name backing the constraint. Dropping the constraint drops the index. Migration 011 must add a replacement index for fast email lookups (cooldown queries).
- The `app/api/professionals/register/route.ts:183` dup-email guard uses `error.code === '23505' && error.message.includes('email')`. After migration 011, this still fires when an attempt to insert a non-rejected row collides with an existing non-rejected row — which is correct behavior (active or submitted pro re-applying). The error message stays valid.
- The cooldown check should look up the **most recent** rejected row, not any rejected row, in case a pro has been rejected multiple times. Use `ORDER BY created_at DESC LIMIT 1` defensively.
- Admin PATCH route's reject branch currently does NOT update `needs_practice_review`. Don't touch it — out of scope.
- The Reject modal in `review/page.tsx:419-422` is purely client-side copy. No API contract changes there.

### Domain context

- **Why 60 days:** Item 5 decision (2026-05-07). Industry default is 6–12 months; Hara's market is small + warm (LATAM holistic-wellness), where long cooldowns burn relationships faster than they filter spam.
- **Why verbatim rejection_reason:** PRD research finding — 80% of rejected candidates would reapply if the rejection felt personalized. Verbatim quoting is the strongest personalization signal and forces admin to write thoughtfully.
- **Why three emails (not two):** The submission-confirmation closes the silence between `submit` and admin decision (a common cause of "is anyone there?" support traffic).
- **Why partial UNIQUE excluding rejected:** Lets a rejected row sit alongside a fresh re-applied row after cooldown. Active/submitted rows still bound to one-per-email.

## Runtime Environment

- **Start command:** `npm run dev` (port 3000)
- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **Tests:** `npm run test` (unit), `npm run test:integration` (integration), `npm run test:all` (both)
- **Migration apply:** Bel applies via Supabase SQL Editor following the same pattern as migration 010 (paste contents, run, verify with `\d professionals`).
- **Health check:** Hit `/profesionales/registro` and submit a test registration; verify (a) admin gets the existing `notifyNewProfessional`, (b) the test email address gets `notifyRegistrationReceived`, (c) `professionals` row is inserted with `status='submitted'`.

## Assumptions

- `professionals.email` is `UNIQUE NOT NULL` (verified via `migrations/001_schema.sql:14`). Tasks 1, 3 depend on this — partial UNIQUE replaces it.
- Resend daily quota is fine for current volume (low single-digits/day per the PRD). No batching needed. Task 2 depends on this.
- The existing `app/api/professionals/register/route.ts` 23505-conflict path returns 409 and that's acceptable for active/submitted-row collisions. Task 3 leaves it intact.
- The existing fire-and-forget pattern (`.catch(() => {})`) is the project's accepted convention for non-blocking email sends. Tasks 3, 4 follow it.
- `app/admin/professionals/[id]/review/page.tsx` only needs copy changes for Flow 6. No new state, no new fields. Task 5 depends on this.
- The cooldown lookup is a hot-enough path that a regular index on `professionals.email` is worth keeping after the partial UNIQUE replaces the implicit one. Task 1 includes it.
- No RLS policy on `professionals` keys on email uniqueness (RLS is by `id`). Verified by absence in `migrations/001_schema.sql` policy block. Task 1 depends on this — if false, partial UNIQUE could break RLS.
- `professionals_email_key` is the actual constraint name. To be confirmed at task start by reading the live schema; if different, the DROP CONSTRAINT statement is updated accordingly.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration 011 breaks existing email-based queries (`/api/professionals/register:143-150` slug generation) | Low | Medium | Slug generation queries by `slug` not `email` — no impact. Verified by reading `register/route.ts:143-150`. |
| Resend rate limit hit during a registration burst | Very low | Low | Existing fire-and-forget pattern means email failures don't block writes. Bel's volume is single-digits/day. |
| Approval email's link to `/p/{slug}` 404s if slug was edited admin-side | Low | Low | Approval email reads slug from the row at email-fire time, not from cached state. Single source of truth. |
| Admin un-rejects (rejected → active) leaves stale `resubmit_after` set | Medium | Very low | Cooldown check only fires on `status='rejected' AND resubmit_after > NOW()`. A stale `resubmit_after` on an active row is inert. Documented; no code change. |
| Partial UNIQUE conflicts when admin flips a rejected pro back to active while another active pro has the same email | Very low | Low | Existing app flow prevents two pros sharing an email (the 23505 guard catches the original submission). Edge case requires admin to manually rebuild the conflict. Caught by the partial UNIQUE — operation simply fails with a constraint error, which is correct behavior. Documented for admin awareness. |
| Cooldown error response shape inconsistent with form's existing error parsing | Low | Low | `error` is the fully-formatted Spanish message (server-composed). The form's existing `data.error` rendering displays it as-is; structured `resubmit_after` and `previous_application_at` are additional fields for future consumers. Zero changes to RegistroForm.tsx. |
| Test inbox not configured — email unit tests run against production Resend by default | Medium | Medium | Unit tests mock the `resend.emails.send` call via `vi.mock('resend')` — never hit the network. Integration test for cooldown does NOT exercise email firing (focuses on schema/handler logic only); manual verification covers the email leg. |
| Parallel re-applications at expiry boundary create duplicate `submitted` rows | Very low | Low | Partial UNIQUE from Task 1 catches the second INSERT with `23505`, which falls through to the existing dup-email guard at `register/route.ts:183-188` returning 409 *"Ya existe una cuenta con este email."* The race-loser sees a slightly misleading 409 (no live account exists, the other request just won by milliseconds) but no duplicate row is created. **Race-safe by construction; no code change needed.** |
| `rejection_reason` content persists in Resend's email logs indefinitely | Low | Low | Resend retains email payloads per their plan terms. A pro who reapplies and gets approved later still has the rejection text in Resend's dashboard. **Mitigation: admin awareness only** — Bel writes rejection_reason as if it were a public statement (which functionally it is — the pro receives it verbatim). No code change. Reflected in admin form copy (Task 5). |
| Admin pastes HTML/script tags into `rejection_reason` | Low | High (without escape) → Very low (with escape) | Task 2 introduces `escapeHtml()` and applies it to `rejection_reason` and `full_name` before rendering. Defense in depth: even though admin is the input source, the threat model crosses a trust boundary (admin-typed text → pro's email client). Verified by escape-regression unit tests. |

⚠️ Mitigations are commitments — verification checks they're implemented.

## Goal Verification

### Truths

1. After a pro submits the registration form, the email address provided in the form receives a confirmation email with subject *"Recibimos tu solicitud en Hara"* — verifiable by manual smoke + email function unit test asserting subject string.
2. After admin approves a submitted pro, the pro's email receives an email with subject *"¡Tu perfil en Hara está activo!"* containing a link to `/p/{slug}` — verifiable by manual smoke + integration test asserting email function called with right args.
3. After admin rejects a submitted pro, the pro's email receives an email with subject *"Sobre tu solicitud en Hara"* containing the `rejection_reason` text **verbatim** in a styled block AND a date `resubmit_after` formatted in Spanish — verifiable by email function unit test asserting body contains the input text unmodified.
4. A pro who tries to re-register with the same email within 60 days of rejection sees an inline form error referencing the resubmit date in Spanish, and no new row is inserted — verifiable by `cooldown-enforcement.test.ts` (TS-002 + TS-003).
5. A pro who re-registers with the same email AFTER `resubmit_after` is allowed through and a fresh `submitted` row is inserted, and the prior `rejected` row remains in the DB — verifiable by `cooldown-enforcement.test.ts`.
6. The Reject modal on `/admin/professionals/[id]/review` shows copy that makes the pro-facing-verbatim semantics explicit (Flow 6) — verifiable by TS-001.
7. All three email functions return `false` (not throw) when `RESEND_API_KEY` is unset, matching the existing `sendEmail` graceful-fail contract — verifiable by `lib/email.test.ts` unit tests. **This holds only if each function is a single `sendEmail({...})` call — bypassing `sendEmail` to call `client.emails.send` directly forfeits the contract. Task 2 enforces this constraint.**
8. After migration 011 applies, `\d professionals` shows `resubmit_after TIMESTAMPTZ`, the `professionals_email_key` constraint is gone, and a partial UNIQUE index `professionals_email_active_unique` exists — verifiable by inspecting the schema post-apply.

### Artifacts

- `lib/email.ts` — `notifyRegistrationReceived`, `notifyProfessionalApproved`, `notifyProfessionalRejected` exports.
- `lib/email.test.ts` — unit tests asserting subject lines, body content (verbatim rejection_reason), graceful failure.
- `migrations/011_pro_resubmit_cooldown.sql` — schema change.
- `app/api/professionals/register/route.ts` — cooldown lookup + confirmation email firing.
- `app/api/admin/professionals/[id]/route.ts` — `resubmit_after` write + approval/rejection email firing.
- `app/admin/professionals/[id]/review/page.tsx` — Reject modal intro copy.
- `__tests__/integration/cooldown-enforcement.test.ts` — DB-backed registration handler test.

## E2E Test Scenarios

### TS-001: Admin sees Flow-6 relabel on Reject modal
**Priority:** High
**Preconditions:** Logged in as admin; at least one pro with `status='submitted'` exists.
**Mapped Tasks:** Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/professionals/[id]/review` for a submitted pro | Page renders with Approve / Reject buttons |
| 2 | Click "Rechazar perfil" | Modal opens |
| 3 | Read intro text above the textarea | Text explicitly says the rejection_reason will be sent to the pro verbatim (matches Flow 6 copy: *"Razón de rechazo (este texto se le enviará al profesional con tus palabras exactas)"* or equivalent) |

### TS-002: Cooldown blocks re-registration within window
**Priority:** Critical
**Preconditions:** Migration 011 applied. A pro exists with `status='rejected'`, known email, and `resubmit_after = NOW() + INTERVAL '30 days'` (within window).
**Mapped Tasks:** Task 1, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profesionales/registro` | Form renders |
| 2 | Fill the 4-step form using the rejected pro's email | Form submits to `/api/professionals/register` |
| 3 | Observe response | API returns 403 with `{ error, resubmit_after, previous_application_at }` where `error` is the fully-composed Spanish message *"Ya aplicaste a Hara el [fecha]. Podés volver a aplicar a partir del [fecha]. Si tenés preguntas, escribinos a centrovitalhara@gmail.com."*; form displays this as the inline error (no client-side date formatting) |
| 4 | Query `professionals` for the email | Still only the original `rejected` row; no new `submitted` row inserted |

### TS-003: Re-registration after window succeeds; old row preserved
**Priority:** High
**Preconditions:** Migration 011 applied. A pro exists with `status='rejected'`, known email, and `resubmit_after = NOW() - INTERVAL '1 day'` (window passed).
**Mapped Tasks:** Task 1, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profesionales/registro` | Form renders |
| 2 | Fill and submit the form using the rejected pro's email | Form submission succeeds (200) |
| 3 | Query `professionals` for the email, ordered by `created_at DESC` | Two rows: a fresh `submitted` row at the top, the original `rejected` row underneath |

## Open Questions

- **`previous_application_at` semantics — application date vs rejection date.** PRD copy says *"Ya aplicaste el [fecha de aplicación previa]"* — *aplicaste* (applied) maps to `created_at`, which is what Task 3 returns. But for a pro who applied Jan 1 and was rejected Jan 15 then retries Mar 1, the message reads *"Ya aplicaste el 1 de enero"* — accurate to the verb but emotionally jarring (they remember being rejected, not applying). Defaulting to `created_at` per PRD literal wording; flag for Bel if she'd prefer rejection date (would require adding a `rejected_at` column or trusting `updated_at`).

## Progress Tracking

- [x] Task 1: Migration 011 — `resubmit_after` + partial UNIQUE
- [x] Task 2: Three new email functions in `lib/email.ts` + unit tests
- [x] Task 3: Registration handler — cooldown check + confirmation email firing
- [x] Task 4: Admin PATCH — approval/rejection email firing + `resubmit_after` write
- [x] Task 5: Reject modal intro copy (Flow 6)
- [x] Task 6: Integration test for cooldown enforcement

**Total Tasks:** 6 | **Completed:** 6 | **Remaining:** 0

> ✅ **Migration 011 applied 2026-05-08.** Integration test `cooldown-enforcement.test.ts` 3/3 green. Partial-UNIQUE smoke test confirmed: rejected + submitted rows coexist for the same email; a second non-rejected row is blocked with `23505`.

## Verification Summary

**Phase A — Code finalization:** ✅
- tsc clean (zero errors)
- 251/251 unit tests pass
- Build clean
- File lengths: all changed files under 800-line guideline
- No new console.log/warn introduced (pre-existing console.warn at lib/email.ts:17 untouched)

**Phase A — Reviewer findings:** 0 must_fix, 5 should_fix, 5 suggestions (general-purpose substituting for `pilot:changes-review` which isn't installed). All 5 should_fix and 4 of 5 suggestions applied:
- SF-1: Removed orphan mock declarations (`mockSingle`, `mockSelect`) in `register/route.test.ts`.
- SF-2: Refactored reject test to capture update payload via shared mock (`builders.lastUpdatePayload`) instead of brittle `mockImplementationOnce` ordering.
- SF-3: Reject modal intro copy aligned with PRD Flow 6 parenthetical form.
- SF-4: Approval email closing changed from gendered *"Bienvenida"* to gender-neutral *"Te damos la bienvenida"* — PRD draft was feminine but the directory is gender-mixed.
- SF-5: Cooldown query gained secondary `.order('id', desc)` tiebreaker (and the test mock chain extended to match).
- S-1: Migration 011 rollback comment notes the constraint-name caveat.
- S-2: `TODO(bel)` comment near the cooldown response composition flagging the `previous_application_at` semantics open question.
- S-4: `target="_blank" rel="noopener"` added to the approval-email profile link.
- S-5: Integration test now asserts `notifyRegistrationReceived` invocation on the success scenarios.
- S-3 (skipped): `it.each` refactor of subject-line tests — cosmetic only, deferred.

**Phase B — Runtime profile: API.** UI change (review modal copy) is purely text, no behavior. Browser E2E skipped per profile classification.
- Build: ✅
- Program execution: dev server runs on :3000, `/admin/login` returns 200.
- Per-task DoD audit: verified during implementation (each task closed only after its DoD criteria green).

**Goal Verification: 7 of 8 truths confirmed by code reading.**

| # | Truth | Status |
|---|-------|--------|
| 1 | Submission confirmation email subject + recipient | ✅ Verified by `lib/email.test.ts` |
| 2 | Approval email subject + `/p/{slug}` link + 3 explainer headings | ✅ Verified by `lib/email.test.ts` |
| 3 | Rejection email subject + verbatim block + Spanish date | ✅ Verified by `lib/email.test.ts` (incl. escape-regression on `<script>` and `<img onerror>`) |
| 4 | Cooldown blocks re-registration within window, no new row | ✅ Verified by `cooldown-enforcement.test.ts` TS-002 (live DB) |
| 5 | Re-registration after window succeeds, two rows preserved | ✅ Verified by `cooldown-enforcement.test.ts` TS-003 (live DB, 2 rows confirmed) |
| 6 | Reject modal copy reflects pro-facing-verbatim semantics | ✅ Verified by reading `review/page.tsx:419-422` |
| 7 | Email functions return `false` (not throw) when `RESEND_API_KEY` unset | ✅ Verified by `lib/email.test.ts` graceful-fail tests |
| 8 | Schema state post-apply (`resubmit_after`, partial UNIQUE, regular index) | ✅ Verified by partial-UNIQUE smoke test (rejected+submitted coexist; second non-rejected blocked with 23505) |

**Not Verified (with reason):**

| Item | Reason |
|---|---|
| Live email delivery to test inbox (Resend dashboard inspection) | Requires manual flow through admin → approve/reject with a real inbox. Unit + integration mocks cover the firing contract; Bel verifies the rendered email post-launch. |
| ~~TS-002 / TS-003 / Truth #4 / #5 / #8~~ | ~~Migration 011 not yet applied~~ — Resolved 2026-05-08: Bel applied migration 011, integration test 3/3 green, partial-UNIQUE smoke test passed. |
| Browser-driven E2E on the Reject modal | Pure copy change, no React behavior change — verified statically by reading the file. Spinning up Chrome to confirm React renders JSX is below the cost/value line. |

## Implementation Tasks

### Task 1: Migration 011 — schema sync + `resubmit_after` + partial UNIQUE

**Objective:** Bring the `migrations/` directory back in sync with the actual production schema (the `'rejected'` status value and `rejection_reason` column live in `scripts/migrate-review-flow.mjs` only — not in any numbered migration), then add the new `resubmit_after` column and replace the unconditional `UNIQUE(email)` constraint with a partial unique index that allows multiple rejected rows per email.

**Dependencies:** None
**Mapped Scenarios:** TS-002, TS-003

**Files:**

- Create: `migrations/011_pro_resubmit_cooldown.sql`

**Key Decisions / Notes:**

- **Schema drift discovered during planning:** `migrations/001_schema.sql:12` defines `CHECK (status IN ('draft','submitted','approved','active','paused'))` — no `'rejected'`. There is also no `rejection_reason` column in any numbered migration. Both were added via `scripts/migrate-review-flow.mjs:50-52` as operator-pasted SQL. Production has them; the repo's numbered migrations don't. Migration 011 fixes this by including the same statements idempotently — ensures fresh test DBs (and CI environments) match prod.
- Wrap all statements in `BEGIN; ... COMMIT;` so partial application leaves the schema clean. Pattern: `migrations/010_holistic_practices_catalog.sql:33`.
- Verify the constraint name on `professionals.email` before writing the DROP. Default Postgres-assigned name is `professionals_email_key`, but if `migrations/001_schema.sql` named it explicitly, use that. Read `migrations/001_schema.sql:14` to confirm — the constraint is inline (`email TEXT UNIQUE NOT NULL`), so default name applies.
- **Statements (in order, all inside one transaction):**

  **Section A — Schema sync (idempotent):**
  1. `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS rejection_reason TEXT;`
  2. `ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_status_check;`
  3. `ALTER TABLE professionals ADD CONSTRAINT professionals_status_check CHECK (status IN ('draft','submitted','approved','active','paused','rejected'));`

  **Section B — Item 3 additions:**
  4. `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS resubmit_after TIMESTAMPTZ NULL;`
  5. `ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_email_key;` (use actual name verified in step above)
  6. `CREATE UNIQUE INDEX IF NOT EXISTS professionals_email_active_unique ON professionals (email) WHERE status != 'rejected';`
  7. `CREATE INDEX IF NOT EXISTS professionals_email_idx ON professionals (email);` (covers cooldown lookups across all statuses)

- All statements use `IF EXISTS` / `IF NOT EXISTS` — the migration is idempotent and safe to re-run on a partially-applied DB.
- Header comment includes the rollback in the same form as `migrations/010_*:122-131`. Rollback statements: drop new index, drop partial UNIQUE, restore unconditional UNIQUE constraint, drop `resubmit_after`. Schema-sync statements are NOT in the rollback (they fix existing prod state, rolling them back would re-break it).
- Do NOT add a trigger to clear `resubmit_after` when status changes — Risks-table item documents that stale `resubmit_after` on an active row is inert.

**Definition of Done:**

- [ ] File created with BEGIN/COMMIT block + header + rollback documentation.
- [ ] All 7 statements present in correct order, all idempotent.
- [ ] Email constraint DROP uses the actual name verified from `001_schema.sql:14`.
- [ ] Status CHECK constraint includes all 6 values (`draft`, `submitted`, `approved`, `active`, `paused`, `rejected`) — matches `scripts/migrate-review-flow.mjs:50-52`.
- [ ] No diagnostics errors (SQL parses, file is valid).

**Verify:**

- Bel applies via Supabase SQL Editor following the same flow as migration 010.
- After apply: `\d professionals` shows `resubmit_after`, the partial UNIQUE index, the regular `professionals_email_idx`, the `rejection_reason` column, and the updated CHECK constraint.
- `SELECT indexname FROM pg_indexes WHERE tablename = 'professionals';` shows both new indexes.
- **Partial-UNIQUE smoke test (run via SQL Editor, then DELETE the test rows):**
  ```sql
  -- Should both succeed
  INSERT INTO professionals (slug, status, full_name, email, whatsapp, country, modality, specialties, bio)
  VALUES ('test-uniq-1', 'rejected', 'Test 1', 'partial-uniq-test@example.com', '+5491100000000', 'AR', '{}', '{}', 'placeholder bio of at least fifty characters to satisfy validation');
  INSERT INTO professionals (slug, status, full_name, email, whatsapp, country, modality, specialties, bio)
  VALUES ('test-uniq-2', 'submitted', 'Test 2', 'partial-uniq-test@example.com', '+5491100000000', 'AR', '{}', '{}', 'placeholder bio of at least fifty characters to satisfy validation');

  -- Should fail with 23505 (two non-rejected rows for same email)
  INSERT INTO professionals (slug, status, full_name, email, whatsapp, country, modality, specialties, bio)
  VALUES ('test-uniq-3', 'active', 'Test 3', 'partial-uniq-test@example.com', '+5491100000000', 'AR', '{}', '{}', 'placeholder bio of at least fifty characters to satisfy validation');

  -- Cleanup
  DELETE FROM professionals WHERE email = 'partial-uniq-test@example.com';
  ```
- Schema verified by extending `scripts/verify-migrations-009-010.mjs` (or new sibling script `verify-migration-011.mjs`) using same pattern.

---

### Task 2: Three new email functions in `lib/email.ts` + helpers + unit tests

**Objective:** Add two small helpers (`emailBaseUrl()` and `escapeHtml()`) plus three new exported functions (`notifyRegistrationReceived`, `notifyProfessionalApproved`, `notifyProfessionalRejected`) that mirror the `notifyReviewRequest` pro-facing pattern. Cover all three with unit tests including verbatim-with-escape semantics for `rejection_reason` and graceful-fail on missing `RESEND_API_KEY`.

**Dependencies:** None
**Mapped Scenarios:** TS-002 (indirectly — assertions on subject/body shape and escape behavior)

**Files:**

- Modify: `lib/email.ts`
- Create: `lib/email.test.ts`

**Key Decisions / Notes:**

- **Helper 1 — `emailBaseUrl(): string`** — added at the top of the file, replaces the inline pattern at `lib/email.ts:113-115`. Correct precedence:
  ```ts
  function emailBaseUrl(): string {
    return process.env.NEXT_PUBLIC_SITE_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  }
  ```
  This fixes a real bug — the existing pattern parses as `(NEXT_PUBLIC_SITE_URL || VERCEL_URL) ? 'https://${VERCEL_URL}' : 'localhost'`, so when `NEXT_PUBLIC_SITE_URL` is set on Vercel it's read but never used in the URL output. The existing `notifyNewProfessional` callsite at line 113-115 is updated to use the helper as part of this PR (one-line inline replacement; no behavior change for that email since Vercel always sets `VERCEL_URL` in the same env where `NEXT_PUBLIC_SITE_URL` is set).

- **Helper 2 — `escapeHtml(str: string): string`** — added at the top of the file. Minimal escape covering the five HTML-significant characters:
  ```ts
  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
  ```
  Applied to **every dynamic field** rendered into email HTML in the three new functions: `full_name`, `rejection_reason`. (Other fields are URLs or generated dates — not user-typed.)

- Mirror `lib/email.ts:162` (`notifyReviewRequest`) exactly: async, returns `Promise<boolean>`, **single `sendEmail({ to, subject, html })` call inside.** Do NOT bypass `sendEmail` to call `client.emails.send` directly — bypassing forfeits the graceful-fail-on-missing-API-key contract that Truth #7 depends on.
- All three functions take a typed argument object (no positional args).
- Subjects (PRD, exact):
  - `notifyRegistrationReceived`: *"Recibimos tu solicitud en Hara"*
  - `notifyProfessionalApproved`: *"¡Tu perfil en Hara está activo!"*
  - `notifyProfessionalRejected`: *"Sobre tu solicitud en Hara"*
- Body copy: PRD's *Draft email copy* section, verbatim. The bracketed placeholders `[nombre]`, `[link a /p/{slug}]`, `[rejection_reason verbatim]`, `[resubmit_after fecha legible]` get substituted with template strings — **escaped values for `[nombre]` and `[rejection_reason]`, raw values for the URL and the formatted date**.
- `notifyProfessionalRejected` body: render the **HTML-escaped** `rejection_reason` inside a `<blockquote>` with brand-aligned styling (left border, italic, padding) **and** `style="white-space: pre-line"` so original `\n` characters render as line breaks. Trim leading/trailing whitespace via `.trim()` BEFORE escaping. NEVER paraphrase. **Do NOT substitute `\n` for `<br>`** — `escapeHtml` would turn the `<br>` into `&lt;br&gt;`. The `white-space: pre-line` CSS handles newlines from raw `\n` correctly even after escaping.
- `notifyProfessionalApproved` body: render `/p/{slug}` link as a brand-pillar button using the same style as `lib/email.ts:148-150`. Slug is already URL-safe by construction (`register/route.ts:22-30` produces `[a-z0-9-]` only) — no `encodeURIComponent` needed; this is documented as an assumption that future schema changes must respect.
- URL construction: `${emailBaseUrl()}/p/${slug}` (no escaping — the URL is composed from a hardcoded path + URL-safe slug + the base URL helper).
- Date formatting: `new Date(resubmit_after).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })` — produces *"15 de julio de 2026"*.
- Argument shapes:
  - `notifyRegistrationReceived({ to: string; full_name: string }): Promise<boolean>`
  - `notifyProfessionalApproved({ to: string; full_name: string; slug: string }): Promise<boolean>`
  - `notifyProfessionalRejected({ to: string; full_name: string; rejection_reason: string; resubmit_after: string | Date }): Promise<boolean>`
- Unit tests (TDD — RED before code):
  - **Subject assertions** (3): each function calls `resend.emails.send` with the exact PRD subject string.
  - **Body content assertions** (4):
    - `notifyRegistrationReceived` body contains the pro's name (escaped form).
    - `notifyProfessionalApproved` body contains `<a href="...">` to `${baseUrl}/p/${slug}` AND the three section headings (`¿Cómo te encuentran?`, `¿Cómo te contactan?`, `¿Querés actualizar algo?`).
    - `notifyProfessionalRejected` body contains the **escaped** `rejection_reason` text inside a `<blockquote ...>` with `white-space: pre-line`.
    - `notifyProfessionalRejected` body contains the Spanish-formatted resubmit date (e.g., *"15 de julio de 2026"*).
  - **Escape regression** (2): when `rejection_reason` contains `<script>alert(1)</script>` or `<img onerror="x">`, the body contains the **escaped** `&lt;script&gt;` / `&lt;img onerror=&quot;x&quot;&gt;` and **NOT** the raw tag. Same assertion for `full_name` containing `<b>X</b>`.
  - **Verbatim preservation** (1): `rejection_reason` with multi-line input (`"line 1\nline 2"`) appears in the body with both lines AND the wrapper has `white-space: pre-line`.
  - **Graceful fail on missing API key** (1, parameterized over the 3 functions): when `RESEND_API_KEY` is unset, each function returns `false` (does not throw). Achieved by mocking `process.env.RESEND_API_KEY` to `undefined` before requiring the module — `getResend()` returns `null` → `sendEmail` returns `false`.
  - **Graceful fail on Resend reject** (1, parameterized over the 3 functions): when `resend.emails.send` rejects with an error, each function returns `false`.
- Mock `resend.emails.send` via `vi.mock('resend')`. NEVER hit the network in unit tests.

**Definition of Done:**

- [ ] `emailBaseUrl()` and `escapeHtml()` helpers added at top of `lib/email.ts`.
- [ ] Existing `notifyNewProfessional` updated to use `emailBaseUrl()` (replaces line 113-115).
- [ ] Three new functions exported from `lib/email.ts`, each a single `sendEmail({...})` call.
- [ ] All three follow the typed-argument-object pattern.
- [ ] PRD's draft copy used verbatim where literal.
- [ ] `escapeHtml` applied to `full_name` and `rejection_reason` in all three functions.
- [ ] `<blockquote style="white-space: pre-line; ...">` wraps the escaped `rejection_reason`.
- [ ] `lib/email.test.ts` exists with the 11+ tests listed above.
- [ ] `npm run test` passes.
- [ ] `npm run lint` clean.

**Verify:**

- `npm run test -- lib/email.test.ts`
- `tsc --noEmit` no errors

---

### Task 3: Registration handler — cooldown check + confirmation email firing

**Objective:** On `POST /api/professionals/register`, after all input validation, look up the most recent rejected row for the submitted email. If `resubmit_after > NOW()`, return a 403 with a fully-composed Spanish error message (including both pre-formatted dates) — no client-side date formatting required. Otherwise, proceed with the existing flow and fire `notifyRegistrationReceived` after the successful insert.

**Dependencies:** Task 1 (column exists), Task 2 (function + helpers exist)
**Mapped Scenarios:** TS-002, TS-003

**Files:**

- Modify: `app/api/professionals/register/route.ts`

**Key Decisions / Notes:**

- **Insertion location: AFTER all input validation, BEFORE slug generation.** Specifically: insert the cooldown check at line ~138 (immediately after the practices validation block at lines 129-138, immediately before slug generation at lines 141-150). Rationale: failing fast on cooldown is only meaningful if the input is otherwise valid — checking cooldown for malformed input wastes a DB roundtrip and produces a confusing UX (which error wins?). Validate input → check cooldown → generate slug → insert. This also makes the integration test boundary cleaner (the test posts well-formed payloads and asserts on cooldown branch only).
- **Cooldown query + server-composed message:**
  ```ts
  const { data: priorRejected } = await supabaseAdmin
    .from('professionals')
    .select('id, created_at, resubmit_after')
    .eq('email', email)
    .eq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (priorRejected?.resubmit_after && new Date(priorRejected.resubmit_after) > new Date()) {
    const fmt = (d: string | Date) =>
      new Date(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    const previousAppliedAt = fmt(priorRejected.created_at)
    const resubmitAfterFmt = fmt(priorRejected.resubmit_after)
    return NextResponse.json({
      error: `Ya aplicaste a Hara el ${previousAppliedAt}. Podés volver a aplicar a partir del ${resubmitAfterFmt}. Si tenés preguntas, escribinos a centrovitalhara@gmail.com.`,
      resubmit_after: priorRejected.resubmit_after,
      previous_application_at: priorRejected.created_at,
    }, { status: 403 })
  }
  ```
- **Why server-side composition:** PRD Flow 4 says the form displays an inline message including both formatted dates. `RegistroForm.tsx:233-239` today only consumes `data.error` as a string. Composing the full message server-side means **zero changes to RegistroForm** — its existing error rendering shows the formatted message correctly. Structured `resubmit_after` and `previous_application_at` are still returned for any future consumer that wants them (admin tools, telemetry).
- Status code: 403 (not 409). Cooldown is a policy block, not a conflict. The form's error handler differentiates by status today (404 / 409 / 500 hit different paths) — 403 falls through to the generic-error display, which is correct here because `data.error` is the full message.
- **Race condition (parallel re-applications at expiry):** Two POSTs with the same email arriving simultaneously right at `resubmit_after`: both can pass the SELECT cooldown check (`resubmit_after <= NOW()`), both attempt INSERT. The partial UNIQUE from Task 1 (`WHERE status != 'rejected'`) catches the second INSERT with a `23505` UNIQUE violation, which falls through to the existing dup-email guard at `register/route.ts:183-188` and returns 409 with *"Ya existe una cuenta con este email."* The race-loser sees a slightly misleading 409 (no live account exists, the other request just won by milliseconds) but no double-row is created. **No code change needed** — the partial UNIQUE makes the race safe by construction. Risks-table item documents this trade-off.
- After the existing `notifyNewProfessional(...).catch(() => {})` line (~210-217), add:
  ```ts
  notifyRegistrationReceived({
    to: email,
    full_name,
  }).catch(() => {})
  ```
- Do NOT change the existing 23505 dup-email guard. With partial UNIQUE active, that guard fires when an active/submitted row already exists for the email — correct behavior.
- Cooldown lookup uses the regular `professionals_email_idx` index from Task 1 — fast path.

**Definition of Done:**

- [ ] Cooldown check inserted AFTER all input validation, before slug generation.
- [ ] Returns 403 with `{ error, resubmit_after, previous_application_at }` when cooldown active; `error` is the fully-formatted Spanish message including both dates and the support email.
- [ ] Confirmation email fired post-insert, fire-and-forget.
- [ ] Existing 23505 guard untouched.
- [ ] `npm run test:integration -- cooldown-enforcement` (Task 6) passes.
- [ ] `npm run lint` clean.

**Verify:**

- `npm run test:integration -- cooldown-enforcement`
- Manual: `curl -X POST http://localhost:3000/api/professionals/register` with a known-rejected-within-window email returns 403 with the composed Spanish message in `data.error`.

---

### Task 4: Admin PATCH — approval/rejection email firing + `resubmit_after` write

**Objective:** When admin approves a submitted pro, fire `notifyProfessionalApproved`. When admin rejects, write `resubmit_after = NOW() + INTERVAL '60 days'` alongside the status flip and fire `notifyProfessionalRejected`.

**Dependencies:** Task 1 (column exists), Task 2 (functions exist)
**Mapped Scenarios:** —

**Files:**

- Modify: `app/api/admin/professionals/[id]/route.ts`

**Key Decisions / Notes:**

- **Reject branch (line 171–193):**
  - Update payload gains `resubmit_after`. Compute server-side: `new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()`.
  - After successful update, fetch the updated row's `email`, `full_name`, and `slug` (or pass them through the `existing` fetch at line 154 — extend that select).
  - Fire `notifyProfessionalRejected({ to, full_name, rejection_reason, resubmit_after }).catch(() => {})`.
  - Return shape unchanged: `{ success: true, status: 'rejected' }`.
- **Approve branch (line 195–214):**
  - No new column writes. The existing payload sets `status: 'active'` and clears `rejection_reason`.
  - After successful update, fire `notifyProfessionalApproved({ to: email, full_name, slug }).catch(() => {})`.
  - The `existing` fetch at line 154 currently selects only `id, status` — extend to `id, status, email, full_name, slug` so the email firing has the data without a second query.
- Both email firings are fire-and-forget (`.catch(() => {})`).
- Do NOT clear `resubmit_after` on un-rejection (admin manual flip rejected → active). Risk-table item documents this is inert.
- Do NOT touch the practices-only or specialty-only branches (line 83–144).

**New unit-test coverage (PATCH branches have ZERO unit tests today — `route.test.ts` is DELETE-only, `route-practices.test.ts` is practices-only):**

Add these to `app/api/admin/professionals/[id]/route.test.ts`:

- **Approve branch fires `notifyProfessionalApproved` with correct args:** mock `@/lib/email`, PATCH with `{ action: 'approve' }`, assert `notifyProfessionalApproved` called once with `{ to: <pro_email>, full_name: <pro_name>, slug: <pro_slug> }`.
- **Approve branch returns success even if email send rejects:** mock `notifyProfessionalApproved` to reject; assert response is still `200 { success: true, status: 'active' }` (fire-and-forget).
- **Reject branch writes `resubmit_after` and fires `notifyProfessionalRejected`:** mock `@/lib/email`, PATCH with `{ action: 'reject', rejection_reason: 'test reason' }`, assert (a) Supabase update payload contains `resubmit_after` set to a date ~60 days from now (allow ±5 minute window for test execution drift), (b) `notifyProfessionalRejected` called with `{ to, full_name, rejection_reason: 'test reason', resubmit_after: <ISO string> }`.
- **Reject branch returns success even if email send rejects:** same fire-and-forget assertion as approve.

**Definition of Done:**

- [ ] Existing-row select extended to include `email, full_name, slug`.
- [ ] Reject branch writes `resubmit_after` (computed as `new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()`) and fires the rejection email.
- [ ] Approve branch fires the approval email.
- [ ] Four new tests added to `route.test.ts` (approve/reject × success/email-rejects).
- [ ] All existing tests in `route.test.ts` and `route-practices.test.ts` continue to pass.
- [ ] `npm run test` passes.
- [ ] `npm run lint` clean.

**Verify:**

- `npm run test -- route.test.ts`
- Manual: trigger an approve in admin UI; verify the test pro's email receives `notifyProfessionalApproved` (preview Resend dashboard or use a test inbox).
- Manual: trigger a reject in admin UI; verify `resubmit_after` is set to ~60 days out via SQL: `SELECT email, status, resubmit_after FROM professionals WHERE id = '<test-id>';`

---

### Task 5: Reject modal intro copy (Flow 6)

**Objective:** Update the Reject modal copy on `/admin/professionals/[id]/review` so admin understands the `rejection_reason` is sent to the pro verbatim.

**Dependencies:** None
**Mapped Scenarios:** TS-001

**Files:**

- Modify: `app/admin/professionals/[id]/review/page.tsx`

**Key Decisions / Notes:**

- Lines 419–422 currently read:
  ```
  Escribí el motivo por el cual se rechaza este perfil. El profesional podrá verlo si le comunicamos la decisión.
  ```
- Replace with copy that makes the auto-send-verbatim semantic explicit. PRD's Flow 6 suggests:
  ```
  Razón de rechazo (este texto se le enviará al profesional con tus palabras exactas)
  ```
- The line is currently a `<p>` above the textarea. Keep the `<p>`, swap the text. Also consider adding a small below-textarea hint such as: *"El profesional recibirá esto en un email automático junto con la fecha en la que puede volver a aplicar (60 días)."*
- The textarea `placeholder` (line 426) stays — the example reason is still helpful guidance.
- No state, no logic changes. Pure copy edit.

**Definition of Done:**

- [ ] Modal intro copy rewritten to make verbatim-pro-facing semantics explicit.
- [ ] Optional hint about the 60-day cooldown added below textarea (recommended).
- [ ] `npm run lint` clean.

**Verify:**

- Run `npm run dev`, navigate to `/admin/professionals/<a-submitted-pro-id>/review`, click Reject, verify the new copy renders.

---

### Task 6: Integration test for cooldown enforcement

**Objective:** DB-backed integration test asserting the cooldown logic in the registration handler. Three scenarios: blocked within window, allowed after window, no prior rejection passes through.

**Dependencies:** Task 1 (migration applied to test DB), Task 3 (handler logic implemented)
**Mapped Scenarios:** TS-002, TS-003

**Files:**

- Create: `__tests__/integration/cooldown-enforcement.test.ts`

**Key Decisions / Notes:**

- Pattern: `__tests__/integration/practices-migration.test.ts:1-15` — `dotenv` config, service-role client, real DB.
- Test setup: `beforeEach` inserts a deterministic test pro at a unique throwaway email (`cooldown-${nanoid()}@test.haravital.app`) with `status='rejected'` and a controlled `resubmit_after`. **`afterEach` deletes BY EMAIL, not by id** — the "after window" test (TS-003) ends with TWO rows for the same email (the original `rejected` seed + the freshly-inserted `submitted` re-application). Cleanup-by-id would leak the second row. Cleanup pattern: `await supabaseAdmin.from('professionals').delete().eq('email', testEmail)`.
- Three test cases:
  1. **Within window (TS-002):** `resubmit_after = NOW() + 30 days`. POST to `/api/professionals/register` (use `next/test-utils` or a direct fetch against the dev server). Assert 403, response JSON contains `resubmit_after` and `previous_application_at`. Assert no new row inserted (`SELECT count(*) WHERE email = X` is still 1).
  2. **After window (TS-003):** `resubmit_after = NOW() - 1 day`. POST. Assert 200/201 success. Assert `count = 2` for that email — one rejected + one fresh submitted. Assert the new row has `status='submitted'`.
  3. **No prior rejection:** Fresh email with no row. POST. Assert success. Assert one row with `status='submitted'`.
- Test runs against the same test DB the rest of the integration suite uses (Supabase service-role client from `.env.local`).
- DOES NOT verify email sending (mocked or skipped). The `notifyRegistrationReceived` fire-and-forget is silent on failure; testing the wiring belongs in the unit tests at `lib/email.test.ts`.
- Cleanup MUST run even on assertion failure — use vitest `afterEach` with the test email captured in a closure, then `DELETE WHERE email = testEmail` (covers all rows for that email regardless of how many got inserted).
- Test naming: `it("should reject re-registration within cooldown window")`, `it("should allow re-registration after cooldown window")`, `it("should allow first-time registration with no prior rejection")`.

**Definition of Done:**

- [ ] Test file exists with 3 tests covering the listed scenarios.
- [ ] Tests use a deterministic throwaway email per run.
- [ ] Cleanup deletes inserted rows reliably.
- [ ] `npm run test:integration -- cooldown-enforcement` passes against a Supabase test DB with migration 011 applied.

**Verify:**

- `npm run test:integration -- cooldown-enforcement`
- Re-run twice in a row — second run should be clean (no leftover test rows).
