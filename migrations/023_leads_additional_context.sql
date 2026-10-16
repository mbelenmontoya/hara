-- Migration 023: Free-text note on concierge requests
-- Adds leads.additional_context, which createLead (app/actions/create-lead.ts) already writes.
-- The concierge form stores the person's name, schedule, whether they saw someone before,
-- and their own words here as a short labeled note for the admin.
-- Applied via Supabase SQL Editor (same as migrations 004-022).
--
-- Rollback:
--   ALTER TABLE leads DROP COLUMN IF EXISTS additional_context;

BEGIN;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS additional_context TEXT;

COMMIT;
