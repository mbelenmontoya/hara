# Cron Infrastructure via n8n

Created: 2026-05-01
Author: belu.montoya@dialpad.com
Category: Infrastructure / Operational
Status: In Progress

## Problem Statement

Hará Match has two scheduled jobs committed to the codebase that have **never run in production**:

- `app/api/cron/expire-destacado/route.ts` — daily 06:00 UTC, expires lapsed Destacado tier subscriptions
- `app/api/cron/send-review-requests/route.ts` — daily 07:00 UTC, sends review-request emails for contacts from 7 days ago

Both routes are configured in `vercel.json` and protected by `CRON_SECRET` Bearer auth. Both were committed on **2026-04-27** (`5568bdb` and `cf2fc6d`). Investigation on **2026-05-01** confirmed they have never fired in production. Three independent failures stack:

1. **Vercel Hobby plan does not fire `vercel.json` crons.** Both route files explicitly comment this: *"On Vercel Hobby, cron jobs do not fire and the Bearer header is NOT injected — use curl as a fallback."* Hará is on Hobby and not on Pro.
2. **Supabase free-tier auto-pauses after ~7 days of inactivity.** The DB has been paused since at least 2026-04-27 (the prod-down incident that opened Phase 0). Even if Vercel crons fired, they would hit a paused DB and silently fail.
3. **Migrations 004 / 005 / 006 are not applied to the live DB.** Both crons call RPCs (`upgrade_destacado_tier`, `select_pending_review_events`) that don't exist yet — even on an unpaused DB, the crons would 500.

The naive fix — *"upgrade Vercel to Pro"* — costs $20/mo for one feature (firing crons), and still leaves the Supabase auto-pause issue unsolved. The structurally correct fix uses infrastructure the user **already owns and runs**: a self-hosted n8n instance at `https://n8n.greenbit.info` (Hetzner + Coolify). n8n is purpose-built for scheduled HTTP requests and can hit Hará's existing cron endpoints with the existing Bearer auth. This is $0/mo of additional cost.

This PRD defines the work to **make the cron infrastructure actually work** by routing scheduled invocations through n8n instead of Vercel.

## Decision: Why n8n, not Vercel Pro / Supabase Pro / DB migration

| Option | Cost | Solves cron firing? | Solves DB pause? | Effort |
|--------|------|---------------------|------------------|--------|
| **n8n (chosen)** | $0/mo | ✅ | ✅ (the Destacado cron's UPDATE keeps DB alive) | ~1 hour |
| Vercel Pro | $20/mo | ✅ | ❌ (DB still pauses on free Supabase) | 5 min |
| Supabase Pro | $25/mo | ❌ (Vercel still won't fire) | ✅ | 5 min |
| Supabase Pro + Vercel Pro | $45/mo | ✅ | ✅ | 10 min |
| Migrate DB to self-hosted Postgres on Hetzner | $0 marginal | ❌ (Vercel still won't fire) | ✅ | 3–7 days (rewrite Auth + Storage layers) |

**n8n wins on three axes:** zero marginal cost, solves both problems with one change, and the user already operates the platform daily. The existing `expire-destacado` cron does a real `UPDATE professionals` query — it functions as a keep-alive heartbeat without needing a separate keep-alive endpoint.

The DB-migration option is not the right answer for this problem. Hará uses Supabase Postgres + Auth + Storage; replacing the latter two would take 3–7 days of focused work plus regression risk on auth and image upload that just stabilized. Worth doing only if/when there is a different reason to leave Supabase entirely (cost at scale, vendor independence). It does not pay back as a fix for cron scheduling.

## Definition of Done

- [ ] Supabase project status is `Active` (manually resumed)
- [ ] Migrations 004 / 005 / 006 applied — every `apply-*-migration.mjs` reports `✓ already applied`
- [ ] `CRON_SECRET` is set in Vercel environment variables (Production scope)
- [ ] n8n instance has 2 workflows running on schedule (one per cron route), both green
- [ ] Both cron endpoints return `200` with non-error JSON when called from n8n
- [ ] `crons` block removed from `vercel.json` (dead config — n8n is now the scheduler)
- [ ] DB stays `Active` for at least 7 consecutive days after first n8n run (proves keep-alive heartbeat works)
- [ ] Plan `main.md` updated to reflect n8n as the scheduler, with a note that Vercel Pro is no longer needed for Phase 1

## Tasks

### Task 1 — Resume Supabase database

**What:** Manually resume the paused Supabase project.

**Why:** Every subsequent task depends on the DB being reachable. Migrations cannot be applied to a paused project; the cron endpoints will 500 against a paused DB; n8n cannot validate its workflows without a working DB.

**How:**
1. Open Supabase dashboard → select the Hará Match project
2. Click **Resume** (free-tier projects auto-pause; this is a single-click recovery)
3. Wait ~30–60 seconds for the project status to flip to `Active`
4. Confirm `curl -I https://hara-weld.vercel.app` returns `200` (middleware no longer crashes)

**Verification:**
- Supabase dashboard project status reads `Active`
- `curl -I https://hara-weld.vercel.app` → `HTTP/2 200`
- `https://hara-weld.vercel.app/profesionales` loads (may show empty state — that's OK at this point)

### Task 2 — Apply migrations 004, 005, 006

**What:** Apply the three pending SQL migrations in order via the Supabase SQL Editor.

**Why:** Without these, both cron routes will 500 on every invocation:
- `expire-destacado` updates `tier_expires_at` (column from migration 005)
- `send-review-requests` calls `select_pending_review_events()` RPC (defined in migration 006, depends on tables from 005 + columns from 004)

The apply scripts at `scripts/apply-*-migration.mjs` will fall back to printing manual instructions when the `exec_sql` RPC isn't available — which is the default. Use the SQL Editor.

**How:**
1. Supabase dashboard → SQL Editor → New query
2. Paste `migrations/004_ranking_foundation.sql` → Run → confirm success
3. New query → paste `migrations/005_destacado_tier_mvp.sql` → Run
4. New query → paste `migrations/006_reviews_collection.sql` → Run
5. All three are idempotent (`IF NOT EXISTS` everywhere) — safe to re-run

**Verification:**
- `node scripts/apply-ranking-migration.mjs` → reports `✓ Migration already applied`
- `node scripts/apply-destacado-migration.mjs` → reports `✓ Migration already applied`
- `node scripts/apply-reviews-migration.mjs` → reports `✓ Migration already applied`
- `https://hara-weld.vercel.app/profesionales` returns 200 (does not 500 on missing `ranking_score` column)

### Task 3 — Configure `CRON_SECRET` in Vercel

**What:** Generate a strong random secret and add it to Vercel environment variables. Also save it in 1Password (or wherever credentials live) — n8n will need the same value.

**Why:** Both cron routes refuse to run unless `CRON_SECRET` is set and matches the incoming `Authorization: Bearer <secret>` header. Without this, n8n hits `401 Unauthorized` on every call.

**How:**
1. Generate a 32-char URL-safe random string locally:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
2. Vercel dashboard → Hará Match project → Settings → Environment Variables
3. Add `CRON_SECRET` = `<generated value>` with scope **Production** (and optionally Preview)
4. Trigger a redeploy so the env var is picked up: push a trivial commit, or use the Vercel UI's "Redeploy" button on the latest production deployment
5. Save the value in 1Password as `Hará — CRON_SECRET` (n8n needs it in Task 4)

**Verification:**
- `curl https://hara-weld.vercel.app/api/cron/expire-destacado` (no auth) → `401 Unauthorized`
- `curl -H "Authorization: Bearer <secret>" https://hara-weld.vercel.app/api/cron/expire-destacado` → `200` with `{"updated":0,"ids":[]}` (or similar valid JSON)
- The same curl on `/api/cron/send-review-requests` → `200` with `{"sent":0,"skipped":0,"skipped_ids":[]}`

### Task 4 — Build the n8n workflows

**What:** Create two workflows in the existing n8n instance at `https://n8n.greenbit.info`, one per cron route. Each workflow is `Schedule Trigger → HTTP Request`.

**Why:** This is the heart of the migration. n8n becomes the actual scheduler.

**How:**

**Workflow A: `Hara — Daily Destacado Expiry`**

1. n8n → New workflow → name it `Hara — Daily Destacado Expiry`
2. Add **Schedule Trigger** node:
   - Mode: `Every day`
   - Time: `06:00` (UTC) — keep matching the original Vercel cron schedule
3. Add **HTTP Request** node, connected to the trigger:
   - Method: `GET`
   - URL: `https://hara-weld.vercel.app/api/cron/expire-destacado`
   - Authentication: `Generic Credential Type` → `Header Auth` → create credential `Hara CRON_SECRET` with header name `Authorization` and value `Bearer <secret>`
   - Options → `Response → Full Response` so n8n captures status code for monitoring
   - Options → `Timeout`: 30 seconds
4. Save → toggle **Active**

**Workflow B: `Hara — Daily Review Request Emails`**

5. Repeat the above with:
   - Workflow name: `Hara — Daily Review Request Emails`
   - Schedule time: `07:00` UTC
   - URL: `https://hara-weld.vercel.app/api/cron/send-review-requests`
   - Same `Hara CRON_SECRET` credential

**On error:** Add an error workflow OR enable n8n's built-in workflow error notifications (Settings → Notifications → Email or Slack). For Phase 0 a single-channel error notification is enough; structured alerting is Phase 1 work.

**Verification:**
- Both workflows show `Active` status in n8n
- Manually trigger each via the n8n UI → both return `200` from the HTTP node
- Wait for the next scheduled run (or trigger manually) — confirm execution log shows green
- For Workflow A: confirm `events` table or `professionals` table reflects the run (no destacados to expire = `{"updated":0}` is the correct success case)
- For Workflow B: confirm log shows `{"sent":0,...}` if no contacts are 7 days old yet — this is also the success case

### Task 5 — Remove dead `vercel.json` crons block

**What:** Delete the `crons` array from `vercel.json` since Vercel is no longer the scheduler.

**Why:** Leaving the block in place is misleading: future-me (or any contributor) reads `vercel.json` and assumes Vercel is firing the crons. Since the project is on Hobby and the block does nothing, removing it makes the actual architecture obvious. n8n is the scheduler now.

**How:**

```diff
{
- "crons": [
-   { "path": "/api/cron/expire-destacado",     "schedule": "0 6 * * *" },
-   { "path": "/api/cron/send-review-requests", "schedule": "0 7 * * *" }
- ]
+ "$schema": "https://openapi.vercel.sh/vercel.json"
}
```

(If `vercel.json` becomes empty, replace with `{}` or remove the file entirely. Verify `npm run build` still succeeds after the change.)

Also update the comment block at the top of each cron route file to remove the "On Vercel Hobby" warning and replace it with a brief note that the route is invoked by n8n (URL: `https://n8n.greenbit.info`, workflow name).

**Verification:**
- `npm run build` succeeds with no warnings about cron config
- `git diff vercel.json` shows the `crons` block removed
- Each cron route file's header comment references n8n, not Vercel cron

### Task 6 — Update the plan + docs

**What:** Reflect the new architecture in `main.md` and update the Phase 0 PRD to point at this PRD as the resolution for Tasks 0 + 1.

**Why:** Without this, the plan still says "verify all 3 cron entries fire on Vercel" (Phase 1, item 2) which is a contradiction now. Future-me reads it and gets confused. Lock the decision in writing.

**How:**

1. `.claude/plans/main.md`:
   - In Phase 0 task list, mark Task 0 (Supabase resume) and Task 1 (apply migrations) as completed and link to this PRD's Task 1/2
   - Add a new "Cron Infrastructure" line under Phase 0 Done criteria, completed
   - In Phase 1, change *"Schedule recurring jobs: ... Verify all 3 cron entries fire on Vercel"* to *"Verify recurring jobs continue firing reliably from n8n. Add structured error alerting (Slack / email) for failed runs."*
2. `docs/prd/2026-04-27-phase-0-activation.md`:
   - Add a `**Resolution:** see [Cron Infrastructure via n8n](./2026-05-01-cron-infrastructure-n8n.md)` line under Task 0 and Task 1
3. `PRODUCT.md`:
   - No change — n8n is infrastructure, not product surface

**Verification:**
- `main.md` Phase 0 + Phase 1 references match reality (n8n, not Vercel cron)
- Phase 0 PRD points at this PRD for resolution of Tasks 0/1
- `git log --oneline` shows a commit with both the cron-infrastructure changes and the doc updates

## Out of Scope

Explicitly **not** part of this PRD:

- A dedicated `/api/cron/keep-alive` endpoint — the existing `expire-destacado` cron's `UPDATE` query is the keep-alive heartbeat. No new endpoint needed.
- Migrating Hará off Supabase to self-hosted Postgres on Hetzner — separate decision, not the right answer for this problem
- Upgrading Vercel to Pro — n8n removes the need
- Upgrading Supabase to Pro — defer until Phase 1+ when there are real users and the cost of a 30-second pause-recovery wait actually matters to anyone
- Structured cron-failure alerting (PagerDuty, Slack channels, escalation rules) — n8n's basic notification is enough for Phase 0; richer alerting is Phase 1 work
- Reconciliation cron (`check_pql_event_integrity`) and event-purge cron (`purge_old_events`) — they exist in the schema but are not currently scheduled. Adding them to n8n is Phase 1 work (the plan already calls this out)

## Risks

1. **n8n instance goes down.** If `https://n8n.greenbit.info` is unreachable, no cron fires. *Mitigation:* this is the same risk profile as Vercel cron going down — every scheduler has this. n8n runs on Hetzner + Coolify which is the user's daily-driven infrastructure; outages are rare and monitored. Add Coolify health monitoring on n8n container if not already present (deferred to Phase 1).
2. **`CRON_SECRET` rotation drift.** If the secret changes in Vercel but not in n8n credentials, every cron starts returning 401. *Mitigation:* document the rotation procedure in the manual-testing doc; both places must be updated together.
3. **Supabase pauses despite the daily heartbeat.** If the daily Destacado cron run somehow fails for 7 consecutive days, the DB pauses again. *Mitigation:* n8n notifications surface failures; the user can act before the 7-day window closes. Worst case, a manual Resume click is the recovery — same as today.
4. **Migration apply blocked.** SQL Editor access is the assumed path; if the dashboard is unavailable, all subsequent tasks block. *Mitigation:* the Supabase dashboard is rarely down; this is a low-probability risk.
5. **n8n schedule misalignment with Hará's UTC schedule expectations.** If n8n's timezone is set to anything other than UTC, the `06:00` and `07:00` triggers fire at the wrong time. *Mitigation:* explicitly select UTC in the Schedule Trigger node config; verify with a manual run.

## Verification Plan

This PRD is complete when:

- [ ] Production site loads (Task 1 — Supabase resumed)
- [ ] All three migrations report `✓ already applied` when re-run (Task 2)
- [ ] `CRON_SECRET` is set in Vercel and confirmed via curl (Task 3)
- [ ] Both n8n workflows are Active and have at least one green execution in their log (Task 4)
- [ ] `vercel.json` no longer contains a `crons` block; `npm run build` clean (Task 5)
- [ ] `main.md` and Phase 0 PRD updated to reflect n8n as scheduler (Task 6)
- [ ] After 7 days of n8n runs, Supabase project is still `Active` (proves keep-alive works in practice)
- [ ] Manual testing doc `docs/manual-testing/2026-05-01-cron-infrastructure-n8n.md` exists with screenshots / curl outputs / n8n run logs

When all checked, this PRD closes and Phase 0's cron-related concerns are fully resolved. The remaining Phase 0 tasks (Resend domain, smoke tests, visual QA, image upload, rejected profile flow) continue independently.

## Manual Testing Documentation

Produces one manual testing doc at `docs/manual-testing/2026-05-01-cron-infrastructure-n8n.md`. It captures:

- Screenshot of Supabase dashboard showing project `Active`
- Screenshots of each migration apply script reporting `✓ already applied`
- Screenshot of Vercel env vars showing `CRON_SECRET` (value redacted) in Production scope
- Screenshots of both n8n workflows in Active state with at least one green execution
- Curl command + output for each cron endpoint as a recovery procedure (in case n8n is down and crons need to be triggered manually)
- Rotation procedure for `CRON_SECRET`: where to update Vercel env var, where to update n8n credential, how to verify post-rotation
- Day-7 verification: timestamp showing Supabase still `Active` after 7 consecutive days of n8n runs
