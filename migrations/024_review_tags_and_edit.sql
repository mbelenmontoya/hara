-- Migration 024: Review tags and editing through the review link
-- 1. Adds reviews.tags: the "¿Qué fue cierto?" chips from the review page (keys from lib/review-form.ts).
-- 2. Replaces submit_review() with a 5-argument version that saves the tags and, when the link was
--    already used but has not expired, updates that review instead of failing ("Editar mi reseña").
--    The aggregates trigger (migration 006) already fires on UPDATE, so ratings stay in sync.
-- Applied via Supabase SQL Editor (same as migrations 004-023).
--
-- Rollback:
--   DROP FUNCTION IF EXISTS submit_review(TEXT, INTEGER, TEXT, TEXT, TEXT[]);
--   then re-run section 5 of migrations/006_reviews_collection.sql (the 4-argument submit_review),
--   then: ALTER TABLE reviews DROP COLUMN IF EXISTS tags;

BEGIN;

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

DROP FUNCTION IF EXISTS submit_review(TEXT, INTEGER, TEXT, TEXT);

-- Steps:
--   1. SELECT ... FOR UPDATE to lock the review_requests row (prevents token-replay race).
--   2. Validate token exists and has not expired.
--   3. Link already used: update the review it created, or fail with token_consumed if there is none.
--   4. First use: pre-check UNIQUE on reviews.contact_event_id, insert the review, mark the token consumed.
--   Returns: { review_id UUID, professional_id UUID }
CREATE OR REPLACE FUNCTION submit_review(
  p_token         TEXT,
  p_rating        INTEGER,
  p_text          TEXT,
  p_reviewer_name TEXT,
  p_tags          TEXT[] DEFAULT '{}'
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_request    review_requests%ROWTYPE;
  v_review_id  UUID;
  v_text       TEXT := NULLIF(TRIM(COALESCE(p_text, '')), '');
  v_name       TEXT := NULLIF(TRIM(COALESCE(p_reviewer_name, '')), '');
  v_tags       TEXT[] := COALESCE(p_tags, '{}');
BEGIN
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'invalid_rating' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_request
  FROM review_requests
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_token' USING ERRCODE = 'P0001';
  END IF;

  IF v_request.expires_at < NOW() THEN
    RAISE EXCEPTION 'token_expired' USING ERRCODE = 'P0001';
  END IF;

  -- Link already used: edit the review it created (same contact event).
  IF v_request.consumed_at IS NOT NULL THEN
    UPDATE reviews
    SET rating = p_rating, text = v_text, reviewer_name = v_name, tags = v_tags
    WHERE contact_event_id = v_request.contact_event_id
    RETURNING id INTO v_review_id;

    IF v_review_id IS NULL THEN
      RAISE EXCEPTION 'token_consumed' USING ERRCODE = 'P0001';
    END IF;

    RETURN jsonb_build_object('review_id', v_review_id, 'professional_id', v_request.professional_id);
  END IF;

  IF EXISTS (SELECT 1 FROM reviews WHERE contact_event_id = v_request.contact_event_id) THEN
    RAISE EXCEPTION 'review_already_exists' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO reviews (professional_id, contact_event_id, rating, text, reviewer_name, tags)
  VALUES (v_request.professional_id, v_request.contact_event_id, p_rating, v_text, v_name, v_tags)
  RETURNING id INTO v_review_id;

  UPDATE review_requests SET consumed_at = NOW() WHERE id = v_request.id;

  RETURN jsonb_build_object('review_id', v_review_id, 'professional_id', v_request.professional_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION submit_review(TEXT, INTEGER, TEXT, TEXT, TEXT[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION submit_review(TEXT, INTEGER, TEXT, TEXT, TEXT[]) TO service_role;

COMMIT;
