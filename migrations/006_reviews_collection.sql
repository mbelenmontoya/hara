-- Hará Match — Reviews Collection System
-- Purpose: reviews + review_requests tables, aggregate trigger that chains into
--          recompute_ranking(), submit_review() atomic RPC, and a helper
--          function for the daily cron.
--
-- Builds on migration 004 (professionals.rating_average + rating_count exist)
-- and migration 005 (recompute_ranking() trigger exists on professionals).
--
-- Apply via: node scripts/apply-reviews-migration.mjs
--        or: Supabase dashboard → SQL Editor → paste this file → Run

-- ─── 1. reviews table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id  UUID        NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  -- contact_event_id stored as UUID (no FK to partitioned events table — enforced via RPC + UNIQUE)
  contact_event_id UUID        UNIQUE,
  rating           INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text             TEXT,
  reviewer_name    TEXT,
  is_hidden        BOOLEAN     NOT NULL DEFAULT false,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Covers /p/[slug] reviews card query + aggregate trigger
CREATE INDEX IF NOT EXISTS idx_reviews_professional
  ON reviews (professional_id, is_hidden, submitted_at DESC);

-- ─── 2. review_requests table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id  UUID        NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  -- contact_event_id stored as UUID (no FK to partitioned events table)
  contact_event_id UUID        UNIQUE NOT NULL,
  email            TEXT        NOT NULL,
  token            TEXT        NOT NULL UNIQUE,
  expires_at       TIMESTAMPTZ NOT NULL,
  consumed_at      TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- For fast token validation (the public submission path)
CREATE INDEX IF NOT EXISTS idx_review_requests_token
  ON review_requests (token);

-- For fast cron check (contact_event_id UNIQUE already covers the anti-dup join,
-- but an explicit index on consumed_at + expires_at speeds the cleanup query)
CREATE INDEX IF NOT EXISTS idx_review_requests_token_state
  ON review_requests (consumed_at, expires_at)
  WHERE consumed_at IS NULL;

-- ─── 2b. RLS — fail-closed (mirrors 001_schema.sql pattern) ───────────────────
-- reviews and review_requests are sensitive:
--   - review_requests stores plaintext one-time tokens + reviewer emails.
--     Public access would let anyone scrape pending tokens and consume them.
--   - reviews are read on /p/[slug] BUT that page uses supabaseAdmin (service role),
--     so RLS does not block legitimate reads. Public submissions go through the
--     submit_review() RPC which has SECURITY DEFINER.
-- Both tables: deny all anon/authenticated access. Service role bypasses RLS.

ALTER TABLE reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all" ON reviews;
CREATE POLICY "Deny all" ON reviews
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny all" ON review_requests;
CREATE POLICY "Deny all" ON review_requests
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ─── 3. Aggregate function ───────────────────────────────────────────────────
--
-- Recomputes professionals.rating_average and rating_count for all non-hidden reviews.
-- Writing to professionals fires the recompute_ranking() trigger from migration 005,
-- which updates ranking_score. The chain is:
--   review INSERT/UPDATE/DELETE
--   → trigger_recompute_review_aggregates()
--   → recompute_review_aggregates()
--   → UPDATE professionals SET rating_average, rating_count
--   → (BEFORE UPDATE trigger) recompute_ranking()
--   → UPDATE professionals.ranking_score
--
-- Note: rating_average defaults to 0 when no visible reviews exist (COALESCE).

CREATE OR REPLACE FUNCTION recompute_review_aggregates(p_professional_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE professionals
  SET
    rating_average = COALESCE(
      (SELECT AVG(rating)::NUMERIC(3,2) FROM reviews
       WHERE professional_id = p_professional_id AND is_hidden = false),
      0
    ),
    rating_count = (
      SELECT COUNT(*) FROM reviews
      WHERE professional_id = p_professional_id AND is_hidden = false
    ),
    updated_at = NOW()
  WHERE id = p_professional_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION recompute_review_aggregates FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION recompute_review_aggregates TO service_role;

-- ─── 4. Trigger on reviews ───────────────────────────────────────────────────
--
-- Uses CASE TG_OP (not COALESCE(NEW.col, OLD.col)) because PL/pgSQL evaluates
-- both COALESCE operands eagerly — NEW.professional_id on a DELETE trigger
-- (where NEW is NULL) raises an error before COALESCE can resolve it.

CREATE OR REPLACE FUNCTION trigger_recompute_review_aggregates()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- DELETE: only OLD row exists.
  -- INSERT: only NEW row exists.
  -- UPDATE: if professional_id was reassigned, BOTH must be recomputed
  --   (the old professional's aggregates would otherwise stay stale).
  IF TG_OP = 'DELETE' THEN
    PERFORM recompute_review_aggregates(OLD.professional_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.professional_id IS DISTINCT FROM NEW.professional_id THEN
    PERFORM recompute_review_aggregates(OLD.professional_id);
  END IF;

  PERFORM recompute_review_aggregates(NEW.professional_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_recompute_aggregates ON reviews;
CREATE TRIGGER reviews_recompute_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_recompute_review_aggregates();

-- ─── 5. submit_review() — atomic token-gated review submission ────────────────
--
-- Steps:
--   1. SELECT ... FOR UPDATE to lock the review_requests row (prevents token-replay race).
--   2. Validate token exists, not consumed, not expired.
--   3. Pre-check UNIQUE on reviews.contact_event_id to surface a friendly error
--      rather than a raw Postgres constraint violation.
--   4. INSERT review row.
--   5. Mark token consumed.
--   Returns: { review_id UUID, professional_id UUID }

CREATE OR REPLACE FUNCTION submit_review(
  p_token         TEXT,
  p_rating        INTEGER,
  p_text          TEXT,
  p_reviewer_name TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_request    review_requests%ROWTYPE;
  v_review_id  UUID;
BEGIN
  -- Validate rating range
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'invalid_rating' USING ERRCODE = 'P0002';
  END IF;

  -- Lock row to prevent concurrent replay
  SELECT * INTO v_request
  FROM review_requests
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_token' USING ERRCODE = 'P0001';
  END IF;

  IF v_request.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'token_consumed' USING ERRCODE = 'P0001';
  END IF;

  IF v_request.expires_at < NOW() THEN
    RAISE EXCEPTION 'token_expired' USING ERRCODE = 'P0001';
  END IF;

  -- Explicit pre-check for existing review (friendly error vs raw constraint)
  IF v_request.contact_event_id IS NOT NULL AND
     EXISTS (SELECT 1 FROM reviews WHERE contact_event_id = v_request.contact_event_id) THEN
    RAISE EXCEPTION 'review_already_exists' USING ERRCODE = 'P0001';
  END IF;

  -- Insert review
  INSERT INTO reviews (
    professional_id, contact_event_id, rating, text, reviewer_name
  ) VALUES (
    v_request.professional_id,
    v_request.contact_event_id,
    p_rating,
    NULLIF(TRIM(COALESCE(p_text, '')), ''),
    NULLIF(TRIM(COALESCE(p_reviewer_name, '')), '')
  )
  RETURNING id INTO v_review_id;

  -- Mark token consumed (atomically within this transaction)
  UPDATE review_requests
  SET consumed_at = NOW()
  WHERE id = v_request.id;

  RETURN jsonb_build_object(
    'review_id',      v_review_id,
    'professional_id', v_request.professional_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION submit_review FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION submit_review TO service_role;

COMMENT ON FUNCTION submit_review IS
  'Atomically validates a single-use review token, inserts the review, and marks '
  'the token consumed. Uses FOR UPDATE to prevent token-replay race conditions. '
  'Raises P0001 for token errors with descriptive message strings.';

-- ─── 6. select_pending_review_events() — cron helper ─────────────────────────
--
-- Returns contact_click events from the last 24-hour window around 7 days ago
-- that have an email in event_data and no existing review_requests row.
-- Used by /api/cron/send-review-requests to avoid a complex PostgREST join
-- on the partitioned events table.

CREATE OR REPLACE FUNCTION select_pending_review_events()
RETURNS TABLE (
  event_id         UUID,
  professional_id  UUID,
  email            TEXT,
  professional_name TEXT,
  professional_slug TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT
    e.id                   AS event_id,
    e.professional_id,
    e.event_data->>'email' AS email,
    p.full_name            AS professional_name,
    p.slug                 AS professional_slug
  FROM events e
  JOIN professionals p ON p.id = e.professional_id
  LEFT JOIN review_requests rr ON rr.contact_event_id = e.id
  WHERE e.event_type = 'contact_click'
    AND e.created_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '6 days'
    AND e.event_data->>'email' IS NOT NULL
    AND rr.id IS NULL
    AND p.status = 'active';
$$;

REVOKE EXECUTE ON FUNCTION select_pending_review_events FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION select_pending_review_events TO service_role;

-- ─── Rollback (run manually if this migration must be undone) ─────────────────
-- NOTE: Fully reverting also requires restoring the previous professionals
--       triggers state from migration 005 if rating columns have been modified.
--
-- DROP TRIGGER IF EXISTS reviews_recompute_aggregates ON reviews;
-- DROP FUNCTION IF EXISTS trigger_recompute_review_aggregates();
-- DROP FUNCTION IF EXISTS select_pending_review_events();
-- DROP FUNCTION IF EXISTS submit_review(TEXT, INTEGER, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS recompute_review_aggregates(UUID);
-- DROP INDEX IF EXISTS idx_review_requests_token_state;
-- DROP INDEX IF EXISTS idx_review_requests_token;
-- DROP TABLE IF EXISTS review_requests;
-- DROP INDEX IF EXISTS idx_reviews_professional;
-- DROP TABLE IF EXISTS reviews;
-- -- Then reset professionals.rating_average and rating_count to 0 if needed:
-- -- UPDATE professionals SET rating_average = 0, rating_count = 0;
