-- Migration 019: Analytics event types
-- Extends events.event_type CHECK constraint to add whatsapp_click and instagram_click.
-- Adds two SECURITY DEFINER RPC functions for DB-level analytics aggregation.
--
-- Depends on: migrations/001_schema.sql (events table + partitioning)
-- Safe to run multiple times (CREATE OR REPLACE + DROP IF EXISTS).

-- ==========================================
-- 1. EXTEND event_type CHECK CONSTRAINT
-- ==========================================
-- The original constraint from 001 allows:
--   lead_submitted, match_created, match_sent, profile_view, contact_click, feedback_submitted
-- We add whatsapp_click and instagram_click for profile-page analytics tracking.
-- profile_view was already allowed; this adds the two new click types.

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE events ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN (
    'lead_submitted',
    'match_created',
    'match_sent',
    'profile_view',
    'contact_click',
    'feedback_submitted',
    'whatsapp_click',
    'instagram_click'
  ));

-- ==========================================
-- 2. ANALYTICS AGGREGATE FUNCTIONS
-- ==========================================
-- These functions return pre-aggregated data so the API route never fetches
-- raw event rows (which could be millions at scale).
-- Both are SECURITY DEFINER so the API can call them via service_role.

-- 2a. Summary: per-professional event counts for a given look-back period.
--     Returns at most (num_professionals × 3) rows regardless of event volume.
CREATE OR REPLACE FUNCTION get_analytics_summary(cutoff_days INT DEFAULT 30)
RETURNS TABLE (professional_id UUID, event_type TEXT, event_count BIGINT)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
  SELECT
    professional_id,
    event_type,
    COUNT(*) AS event_count
  FROM events
  WHERE event_type IN ('profile_view', 'whatsapp_click', 'instagram_click')
    AND professional_id IS NOT NULL
    AND created_at >= NOW() - make_interval(days => cutoff_days)
  GROUP BY professional_id, event_type;
$$;

REVOKE EXECUTE ON FUNCTION get_analytics_summary(INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_analytics_summary(INT) TO service_role;

-- 2b. Time series: daily breakdown for one professional.
--     Returns at most (cutoff_days × 3) rows.
CREATE OR REPLACE FUNCTION get_analytics_timeseries(pro_id UUID, cutoff_days INT DEFAULT 30)
RETURNS TABLE (event_date DATE, event_type TEXT, event_count BIGINT)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
  SELECT
    created_at::date AS event_date,
    event_type,
    COUNT(*) AS event_count
  FROM events
  WHERE professional_id = pro_id
    AND event_type IN ('profile_view', 'whatsapp_click', 'instagram_click')
    AND created_at >= NOW() - make_interval(days => cutoff_days)
  GROUP BY created_at::date, event_type
  ORDER BY event_date;
$$;

REVOKE EXECUTE ON FUNCTION get_analytics_timeseries(UUID, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_analytics_timeseries(UUID, INT) TO service_role;

-- ==========================================
-- 4. FIX create_pql_from_contact_click TRIGGER
-- ==========================================
-- Pre-existing bug: the trigger fires on ALL contact_click events and tries to INSERT
-- into pqls with match_id = null, violating pqls.match_id NOT NULL. Direct profile
-- contact_click events (from /p/[slug]) have match_id = null — they are not concierge
-- events and must not create PQL records. This adds a null guard.

CREATE OR REPLACE FUNCTION create_pql_from_contact_click()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create a PQL for concierge-attributed events (match_id is set).
  -- Direct profile contacts (match_id IS NULL) are not billable.
  IF NEW.event_type = 'contact_click' AND NEW.match_id IS NOT NULL THEN
    INSERT INTO pqls (match_id, lead_id, professional_id, event_id, event_created_at, tracking_code, billing_month)
    VALUES (NEW.match_id, NEW.lead_id, NEW.professional_id, NEW.id, NEW.created_at, NEW.tracking_code,
            date_trunc('month', NEW.created_at)::date)
    ON CONFLICT (match_id, professional_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

-- ==========================================
-- ROLLBACK (run manually if needed)
-- ==========================================
-- ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;
-- ALTER TABLE events ADD CONSTRAINT events_event_type_check
--   CHECK (event_type IN (
--     'lead_submitted', 'match_created', 'match_sent', 'profile_view',
--     'contact_click', 'feedback_submitted'
--   ));
-- DROP FUNCTION IF EXISTS get_analytics_summary(INT);
-- DROP FUNCTION IF EXISTS get_analytics_timeseries(UUID, INT);
-- To revert trigger fix: restore the original function from migrations/001_schema.sql:
-- CREATE OR REPLACE FUNCTION create_pql_from_contact_click() ... (without the IS NOT NULL guard)
