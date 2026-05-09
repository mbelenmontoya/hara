-- Migration 011: Pro Resubmit Cooldown
--
-- Two-section migration. Section A is a one-time schema sync (idempotent)
-- bringing the numbered migrations back in line with what already exists in
-- production: the 'rejected' status value and the rejection_reason column
-- were added by scripts/migrate-review-flow.mjs as operator-pasted SQL,
-- never landed in a numbered migration. Fresh test DBs and CI environments
-- bootstrapped from migrations/001..010 alone do not have either, which
-- means the cooldown logic added in section B would be unreachable.
--
-- Section B adds the resubmit_after cooldown column on professionals,
-- replaces the unconditional UNIQUE(email) constraint with a partial
-- UNIQUE index excluding 'rejected' rows, and adds a regular index on
-- email so cooldown lookups stay fast across all statuses.
--
-- Operation order (all inside one transaction):
--   Section A — Schema sync
--     1. ADD COLUMN IF NOT EXISTS rejection_reason
--     2. DROP CONSTRAINT IF EXISTS professionals_status_check
--     3. ADD CONSTRAINT professionals_status_check (now includes 'rejected')
--   Section B — Item 3 additions
--     4. ADD COLUMN IF NOT EXISTS resubmit_after
--     5. DROP CONSTRAINT IF EXISTS professionals_email_key
--     6. CREATE UNIQUE INDEX professionals_email_active_unique (partial)
--     7. CREATE INDEX professionals_email_idx (regular, all statuses)
--
-- All statements are idempotent (IF EXISTS / IF NOT EXISTS) and the
-- migration is safe to re-run on a partially-applied DB.
--
-- Rollback (manual): runs only the section-B additions in reverse — section A
-- statements fix existing prod state and rolling them back would re-break it.

BEGIN;

-- ============================================================================
-- SECTION A — Schema sync
-- ============================================================================

-- 1. Ensure rejection_reason column exists. Production already has it (added
--    via scripts/migrate-review-flow.mjs), but fresh DBs do not.
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2 + 3. Replace the status CHECK constraint to include 'rejected'.
--    The original constraint at 001_schema.sql:12 lists only
--    ('draft','submitted','approved','active','paused'). Production has been
--    accepting 'rejected' because scripts/migrate-review-flow.mjs:50-52
--    altered the constraint manually.
ALTER TABLE professionals
  DROP CONSTRAINT IF EXISTS professionals_status_check;

ALTER TABLE professionals
  ADD CONSTRAINT professionals_status_check
  CHECK (status IN ('draft','submitted','approved','active','paused','rejected'));

-- ============================================================================
-- SECTION B — Item 3 additions (cooldown infrastructure)
-- ============================================================================

-- 4. Add resubmit_after for the 60-day re-application cooldown. Set on reject
--    by the admin PATCH route, checked by the registration handler before
--    accepting a re-application.
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS resubmit_after TIMESTAMPTZ NULL;

-- 5. Drop the unconditional UNIQUE(email) constraint. The constraint was
--    added inline at 001_schema.sql:14 (`email TEXT UNIQUE NOT NULL`), which
--    Postgres named `professionals_email_key` by convention.
ALTER TABLE professionals
  DROP CONSTRAINT IF EXISTS professionals_email_key;

-- 6. Replace with a partial UNIQUE index. Allows multiple rejected rows per
--    email (preserved as application history) while keeping at most one
--    non-rejected row per email (the live applicant). This is what makes
--    "old row stays in DB" possible after a rejected pro re-applies post
--    cooldown — Flow 5 in the PRD.
CREATE UNIQUE INDEX IF NOT EXISTS professionals_email_active_unique
  ON professionals (email)
  WHERE status != 'rejected';

-- 7. Regular index on email — covers cooldown lookups, which scan rejected
--    rows specifically and are not satisfied by the partial UNIQUE alone.
CREATE INDEX IF NOT EXISTS professionals_email_idx
  ON professionals (email);

COMMIT;

-- Rollback (Section B only — manual):
-- NOTE: the ADD CONSTRAINT line below restores the default Postgres-assigned
-- name `professionals_email_key`. If your environment had a non-default name
-- on the original UNIQUE(email) constraint, substitute it here.
-- BEGIN;
-- DROP INDEX IF EXISTS professionals_email_idx;
-- DROP INDEX IF EXISTS professionals_email_active_unique;
-- ALTER TABLE professionals ADD CONSTRAINT professionals_email_key UNIQUE (email);
-- ALTER TABLE professionals DROP COLUMN IF EXISTS resubmit_after;
-- COMMIT;
--
-- Section A is forward-only. Rolling it back would re-break production by
-- removing the rejection_reason column the admin reject branch writes to and
-- restoring a CHECK constraint that forbids the 'rejected' status.
