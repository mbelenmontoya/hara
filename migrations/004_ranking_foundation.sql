-- Hará Match — Ranking Foundation
-- Purpose: Add ranking columns to professionals, trigger-driven scoring function,
--          and directory query index. Mirrors lib/profile-score.ts exactly.
--
-- Apply via Supabase dashboard SQL editor or psql before running integration tests.
-- Backfill fires automatically via the UPDATE at the bottom of this file.

-- ─── 1. New columns on professionals ─────────────────────────────────────────

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS profile_completeness_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_average             NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count               INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_tier          TEXT NOT NULL DEFAULT 'basico'
    CHECK (subscription_tier IN ('basico','destacado')),
  ADD COLUMN IF NOT EXISTS ranking_score              NUMERIC(6,2) NOT NULL DEFAULT 0;

-- ─── 2. Directory query index ─────────────────────────────────────────────────

-- Covers the /profesionales directory query:
-- WHERE status = 'active' AND accepting_new_clients = true ORDER BY ranking_score DESC
CREATE INDEX IF NOT EXISTS idx_professionals_directory
  ON professionals (status, accepting_new_clients, ranking_score DESC);

-- ─── 3. Trigger function — mirrors lib/profile-score.ts ──────────────────────
--
-- Weights (10 criteria, total 100 pts):
--   profileImage         15   bio                  15   specialties           15
--   shortDescription     10   experienceDescription 10   serviceType           10
--   locationClarity      10   instagram              5   whatsapp               5
--   modality              5
--
-- NULL-handling notes (spec-review must_fix):
--   - array columns: COALESCE(array_length(col,1), 0) >= 1
--     because array_length on NULL/empty returns NULL, not 0.
--   - online_only: COALESCE(online_only, false) = true
--     because NULL = true is NULL (falsy) in SQL; matches TS's `p.online_only || ...`
--
-- Ranking formula: round(0.7*completeness + 0.2*rating_contribution + 0.1*tier_contribution, 2)
--   rating_contribution = LEAST(rating_average * 20, 100) when rating_count > 0, else 0
--   tier_contribution   = 100 when subscription_tier = 'destacado', else 0
--
-- At launch all rating_count=0 and subscription_tier='basico', so:
--   ranking_score = round(0.7 * profile_completeness_score, 2)
--
-- Performance: O(1) per row. Revisit if professional count crosses ~5000.
-- Named constants live in lib/ranking.ts (TS) and must be kept in sync with weights above.

CREATE OR REPLACE FUNCTION recompute_ranking()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_completeness       INTEGER := 0;
  v_rating_contrib     NUMERIC(8,4) := 0;
  v_tier_contrib       NUMERIC(8,4) := 0;
BEGIN
  -- profileImage (15 pts)
  IF NEW.profile_image_url IS NOT NULL AND length(trim(NEW.profile_image_url)) > 0 THEN
    v_completeness := v_completeness + 15;
  END IF;

  -- shortDescription (10 pts)
  IF NEW.short_description IS NOT NULL AND length(trim(NEW.short_description)) > 0 THEN
    v_completeness := v_completeness + 10;
  END IF;

  -- bio (15 pts) — requires at least 50 chars after trim, matching TS: bio.trim().length >= 50
  IF NEW.bio IS NOT NULL AND length(trim(NEW.bio)) >= 50 THEN
    v_completeness := v_completeness + 15;
  END IF;

  -- experienceDescription (10 pts)
  IF NEW.experience_description IS NOT NULL AND length(trim(NEW.experience_description)) > 0 THEN
    v_completeness := v_completeness + 10;
  END IF;

  -- specialties (15 pts) — COALESCE guards NULL/empty array
  IF COALESCE(array_length(NEW.specialties, 1), 0) >= 1 THEN
    v_completeness := v_completeness + 15;
  END IF;

  -- serviceType (10 pts)
  IF COALESCE(array_length(NEW.service_type, 1), 0) >= 1 THEN
    v_completeness := v_completeness + 10;
  END IF;

  -- locationClarity (10 pts) — COALESCE guards NULL online_only
  IF COALESCE(NEW.online_only, false) = true
     OR (NEW.city IS NOT NULL AND length(trim(NEW.city)) > 0)
  THEN
    v_completeness := v_completeness + 10;
  END IF;

  -- instagram (5 pts)
  IF NEW.instagram IS NOT NULL AND length(trim(NEW.instagram)) > 0 THEN
    v_completeness := v_completeness + 5;
  END IF;

  -- whatsapp (5 pts)
  IF NEW.whatsapp IS NOT NULL AND length(trim(NEW.whatsapp)) > 0 THEN
    v_completeness := v_completeness + 5;
  END IF;

  -- modality (5 pts)
  IF COALESCE(array_length(NEW.modality, 1), 0) >= 1 THEN
    v_completeness := v_completeness + 5;
  END IF;

  -- Write completeness back to the row
  NEW.profile_completeness_score := v_completeness;

  -- Rating contribution (0–100 pts before weight)
  v_rating_contrib := CASE
    WHEN NEW.rating_count > 0 THEN LEAST(NEW.rating_average * 20, 100)
    ELSE 0
  END;

  -- Tier contribution (0 or 100 pts before weight)
  v_tier_contrib := CASE
    WHEN NEW.subscription_tier = 'destacado' THEN 100
    ELSE 0
  END;

  -- Final ranking score (rounded to 2 decimals, max ~100)
  NEW.ranking_score := round(
    0.7 * v_completeness
    + 0.2 * v_rating_contrib
    + 0.1 * v_tier_contrib,
    2
  );

  RETURN NEW;
END;
$$;

-- Trigger functions don't need EXECUTE granted — they run as the table owner.
-- Service role already has full table access.

-- ─── 4. Attach trigger to professionals ──────────────────────────────────────
-- Use DROP + CREATE (explicit) rather than CREATE OR REPLACE TRIGGER
-- because the latter has different semantics on Postgres < 14.
-- Supabase runs Postgres 15 — see plan Assumptions.

DROP TRIGGER IF EXISTS professionals_recompute_ranking ON professionals;

CREATE TRIGGER professionals_recompute_ranking
  BEFORE INSERT OR UPDATE ON professionals
  FOR EACH ROW EXECUTE FUNCTION recompute_ranking();

-- ─── 5. Backfill all existing rows ───────────────────────────────────────────
-- Touch updated_at so the BEFORE UPDATE trigger fires for every row.
-- This runs inside the same transaction as the DDL above — if it fails,
-- the whole migration rolls back and can be re-run safely.

UPDATE professionals SET updated_at = NOW();

-- ─── Rollback (run manually if migration must be undone) ───────────────────────
-- DROP TRIGGER IF EXISTS professionals_recompute_ranking ON professionals;
-- DROP FUNCTION IF EXISTS recompute_ranking();
-- DROP INDEX IF EXISTS idx_professionals_directory;
-- ALTER TABLE professionals
--   DROP COLUMN IF EXISTS profile_completeness_score,
--   DROP COLUMN IF EXISTS rating_average,
--   DROP COLUMN IF EXISTS rating_count,
--   DROP COLUMN IF EXISTS subscription_tier,
--   DROP COLUMN IF EXISTS ranking_score;
