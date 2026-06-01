-- 013_score_overrides_and_aliases.sql
-- Two additions, both idempotent / safe to re-run.
--
-- 1. score_overrides on professionals: admin corrections to per-criterion scores.
-- 2. aliases on practices: alternate ways to write the same practice name,
--    useful for normalization and future search matching.

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS score_overrides jsonb NOT NULL DEFAULT '{}';

ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';
