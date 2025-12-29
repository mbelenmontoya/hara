-- Hara Match - Atomic Match Creation Function
-- Purpose: Create match + 3 recommendations in single transaction
-- Security: SECURITY DEFINER with safe search_path, service_role only

-- Add UNIQUE constraint to tracking_code (prevent duplicates)
ALTER TABLE matches ADD CONSTRAINT matches_tracking_code_unique UNIQUE (tracking_code);

-- Function: Atomic match creation
CREATE OR REPLACE FUNCTION create_match_with_recommendations(
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
  v_match_id UUID;
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
    array_agg((rec->>'professional_id')::UUID),
    array_agg((rec->>'rank')::INTEGER)
  INTO v_professional_ids, v_ranks
  FROM jsonb_array_elements(p_recommendations) rec;

  -- Validate 3 distinct professionals
  IF (SELECT COUNT(DISTINCT x) FROM unnest(v_professional_ids) x) != 3 THEN
    RAISE EXCEPTION '3 distinct professionals required';
  END IF;

  -- Validate ranks are 1, 2, 3
  IF v_ranks != ARRAY[1,2,3]::INTEGER[] THEN
    RAISE EXCEPTION 'Ranks must be 1, 2, 3';
  END IF;

  -- Create match
  INSERT INTO matches (lead_id, tracking_code, status, sent_at)
  VALUES (p_lead_id, p_tracking_code, 'sent', NOW())
  RETURNING id INTO v_match_id;

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
      v_match_id,
      (v_rec->>'professional_id')::UUID,
      (v_rec->>'rank')::INTEGER,
      (SELECT array_agg(x) FROM jsonb_array_elements_text(v_rec->'reasons') x),
      v_rec->>'attribution_token'
    );
  END LOOP;

  -- Return match details
  RETURN jsonb_build_object(
    'match_id', v_match_id,
    'tracking_code', p_tracking_code
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION create_match_with_recommendations FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_match_with_recommendations TO service_role;
