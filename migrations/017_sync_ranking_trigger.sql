-- 017_sync_ranking_trigger.sql
--
-- Syncs recompute_ranking() with the updated profile-score.ts formula
-- (overhaul from 2026-05-30 session). The old trigger used binary weights
-- from migration 004; the new formula uses partial/tiered scoring and
-- different weights per criterion.
--
-- After updating the function, re-runs the trigger on all active/submitted
-- professionals so their ranking_score reflects the new formula immediately.

CREATE OR REPLACE FUNCTION recompute_ranking()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_completeness   INTEGER := 0;
  v_rating_contrib NUMERIC(8,4) := 0;
  v_tier_contrib   NUMERIC(8,4) := 0;
  v_bio_len        INTEGER;
  v_short_len      INTEGER;
  v_exp_len        INTEGER;
BEGIN
  -- ── Mandatory fields (5pts each) ─────────────────────────────────────────

  -- whatsapp (5pts — binary)
  IF NEW.whatsapp IS NOT NULL AND length(trim(NEW.whatsapp)) > 0 THEN
    v_completeness := v_completeness + 5;
  END IF;

  -- modality (5pts — binary: ≥1 entry)
  IF COALESCE(array_length(NEW.modality, 1), 0) >= 1 THEN
    v_completeness := v_completeness + 5;
  END IF;

  -- practices (5pts — binary: ≥1 practice; column renamed from specialties in migration 010)
  IF COALESCE(array_length(NEW.practices, 1), 0) >= 1 THEN
    v_completeness := v_completeness + 5;
  END IF;

  -- bio (5pts — tiered: <100→0, 100–249→2, ≥250→5)
  v_bio_len := COALESCE(length(trim(NEW.bio)), 0);
  IF    v_bio_len >= 250 THEN v_completeness := v_completeness + 5;
  ELSIF v_bio_len >= 100 THEN v_completeness := v_completeness + 2;
  END IF;

  -- ── Optional fields (10–15pts each) ──────────────────────────────────────

  -- profileImage (10pts — binary; raw filenames don't count, must start with http)
  IF NEW.profile_image_url IS NOT NULL AND NEW.profile_image_url LIKE 'http%' THEN
    v_completeness := v_completeness + 10;
  END IF;

  -- shortDescription (15pts — tiered: <25→0, 25–49→7, ≥50→15)
  v_short_len := COALESCE(length(trim(NEW.short_description)), 0);
  IF    v_short_len >= 50 THEN v_completeness := v_completeness + 15;
  ELSIF v_short_len >= 25 THEN v_completeness := v_completeness + 7;
  END IF;

  -- experienceDescription (15pts — tiered: <50→0, 50–149→7, ≥150→15)
  v_exp_len := COALESCE(length(trim(NEW.experience_description)), 0);
  IF    v_exp_len >= 150 THEN v_completeness := v_completeness + 15;
  ELSIF v_exp_len >= 50  THEN v_completeness := v_completeness + 7;
  END IF;

  -- serviceType (15pts — binary: ≥1 entry)
  IF COALESCE(array_length(NEW.service_type, 1), 0) >= 1 THEN
    v_completeness := v_completeness + 15;
  END IF;

  -- locationClarity (15pts — binary: online_only OR city non-empty)
  IF COALESCE(NEW.online_only, false) = true
     OR (NEW.city IS NOT NULL AND length(trim(NEW.city)) > 0)
  THEN
    v_completeness := v_completeness + 15;
  END IF;

  -- instagram (10pts — binary)
  IF NEW.instagram IS NOT NULL AND length(trim(NEW.instagram)) > 0 THEN
    v_completeness := v_completeness + 10;
  END IF;

  -- Write completeness back so it is queryable
  NEW.profile_completeness_score := v_completeness;

  -- Rating contribution (0–100 before weight)
  v_rating_contrib := CASE
    WHEN NEW.rating_count > 0 THEN LEAST(NEW.rating_average * 20, 100)
    ELSE 0
  END;

  -- Tier contribution — expiry-aware (migration 005 added tier_expires_at)
  v_tier_contrib := CASE
    WHEN NEW.subscription_tier = 'destacado'
         AND (NEW.tier_expires_at IS NULL OR NEW.tier_expires_at > now())
    THEN 100
    ELSE 0
  END;

  -- Final ranking score: 70% completeness + 20% rating + 10% tier
  NEW.ranking_score := round(
    0.7 * v_completeness
    + 0.2 * v_rating_contrib
    + 0.1 * v_tier_contrib,
    2
  );

  RETURN NEW;
END;
$$;

-- Re-run the trigger on all professionals so ranking_score reflects the
-- new formula immediately. Touching bio fires the BEFORE UPDATE trigger
-- without changing any meaningful data.
UPDATE professionals
SET    bio = bio
WHERE  status IN ('active', 'submitted');
