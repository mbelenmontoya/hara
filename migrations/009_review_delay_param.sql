-- Migration 009: Parameterize review delay + fix dropped-events window bug
--
-- Two changes to select_pending_review_events():
--
-- 1. Add `delay_days INT DEFAULT 7` parameter so the cron route can pass any
--    delay (0 in dev for instant testing, 7 in prod). Removes the magic number
--    from SQL and gives the TS side a single source of truth.
--
-- 2. Replace `BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '6 days'`
--    with `< NOW() - make_interval(days => delay_days)`. The original 24-hour
--    BETWEEN window assumed the cron fires every 24 hours — if a single run
--    is missed (Vercel hiccup, Supabase paused, deploy), events on day 7 fall
--    to day 8 and exit the window forever, never triggering a review email.
--    Switching to `<` makes the cron self-healing: any old eligible event
--    that hasn't been sent gets picked up next run.
--
--    The "no duplicate sends" guarantee comes from the LEFT JOIN on
--    review_requests + `rr.id IS NULL` — that hasn't changed.

CREATE OR REPLACE FUNCTION select_pending_review_events(delay_days INT DEFAULT 7)
RETURNS TABLE (
  event_id          UUID,
  professional_id   UUID,
  email             TEXT,
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
    AND e.created_at < NOW() - make_interval(days => delay_days)
    AND e.event_data->>'email' IS NOT NULL
    AND rr.id IS NULL
    AND p.status = 'active';
$$;

REVOKE EXECUTE ON FUNCTION select_pending_review_events(INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION select_pending_review_events(INT) TO service_role;

-- The 0-arg signature from migration 006 is replaced by this 1-arg signature
-- (default value preserves callers that pass nothing). Drop the old one to
-- avoid ambiguous overload resolution.
DROP FUNCTION IF EXISTS select_pending_review_events();

-- Rollback (manual):
-- DROP FUNCTION IF EXISTS select_pending_review_events(INT);
-- Then re-run the original CREATE FUNCTION from migration 006.
