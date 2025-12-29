-- Hara Match - Production Hardening (Week 3 Final)
-- Purpose: Make match creation fully atomic, add constraints, enforce NOT NULL

-- Add UNIQUE constraint on (match_id, rank)
ALTER TABLE match_recommendations
  ADD CONSTRAINT match_recommendations_match_rank_unique UNIQUE (match_id, rank);

-- Enforce attribution_token is NOT NULL
ALTER TABLE match_recommendations
  ALTER COLUMN attribution_token SET NOT NULL;

-- Drop old RPC (will be replaced with improved version)
DROP FUNCTION IF EXISTS create_match_with_recommendations(UUID, TEXT, JSONB);

-- New RPC: Fully atomic match creation with pre-generated match_id and tokens
CREATE OR REPLACE FUNCTION create_match_with_recommendations_atomic(
  p_match_id UUID,
  p_lead_id UUID,
  p_tracking_code TEXT,
  p_recommendations JSONB  -- [{professional_id, rank, reasons[], attribution_token}]
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_rec JSONB;
  v_professional_ids UUID[];
  v_ranks INTEGER[];
BEGIN
  -- Validate exactly 3 recommendations
  IF jsonb_array_length(p_recommendations) != 3 THEN
    RAISE EXCEPTION 'Exactly 3 recommendations required';
  END IF;

  -- Extract professional_ids and ranks
  SELECT
    array_agg((rec->>'professional_id')::UUID ORDER BY (rec->>'rank')::INTEGER),
    array_agg((rec->>'rank')::INTEGER ORDER BY (rec->>'rank')::INTEGER)
  INTO v_professional_ids, v_ranks
  FROM jsonb_array_elements(p_recommendations) rec;

  -- Validate 3 distinct professionals
  IF (SELECT COUNT(DISTINCT x) FROM unnest(v_professional_ids) x) != 3 THEN
    RAISE EXCEPTION '3 distinct professionals required';
  END IF;

  -- Validate ranks are exactly 1, 2, 3
  IF v_ranks != ARRAY[1,2,3]::INTEGER[] THEN
    RAISE EXCEPTION 'Ranks must be 1, 2, 3';
  END IF;

  -- Validate all attribution_tokens are not empty
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_recommendations) rec
    WHERE (rec->>'attribution_token') IS NULL OR (rec->>'attribution_token') = ''
  ) THEN
    RAISE EXCEPTION 'All attribution_tokens required';
  END IF;

  -- Create match
  INSERT INTO matches (id, lead_id, tracking_code, status, sent_at)
  VALUES (p_match_id, p_lead_id, p_tracking_code, 'sent', NOW());

  -- Insert all 3 recommendations atomically
  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_recommendations)
  LOOP
    INSERT INTO match_recommendations (
      match_id,
      professional_id,
      rank,
      reasons,
      attribution_token
    )
    VALUES (
      p_match_id,
      (v_rec->>'professional_id')::UUID,
      (v_rec->>'rank')::INTEGER,
      (SELECT array_agg(x) FROM jsonb_array_elements_text(v_rec->'reasons') x),
      v_rec->>'attribution_token'
    );
  END LOOP;

  -- Return match details
  RETURN jsonb_build_object(
    'match_id', p_match_id,
    'tracking_code', p_tracking_code
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION create_match_with_recommendations_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_match_with_recommendations_atomic TO service_role;

COMMENT ON FUNCTION create_match_with_recommendations_atomic IS
  'Atomically creates match + 3 recommendations with pre-generated tokens. All-or-nothing transaction.';
