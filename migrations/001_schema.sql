-- Hara Match - Initial Schema Migration
-- Generated from: FINAL_SPEC.md
-- Purpose: Create all tables, indexes, RLS policies, triggers, and operational functions

-- ==========================================
-- CORE TABLES
-- ==========================================

CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','submitted','approved','active','paused')),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  whatsapp TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  online_only BOOLEAN DEFAULT false,
  modality TEXT[] NOT NULL,
  specialties TEXT[] NOT NULL,
  style TEXT[],
  price_range_min INTEGER,
  price_range_max INTEGER,
  currency TEXT DEFAULT 'USD',
  accepting_new_clients BOOLEAN DEFAULT true,
  bio TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_professionals_status ON professionals(status);
CREATE INDEX idx_professionals_country ON professionals(country, city);
CREATE INDEX idx_professionals_modality ON professionals USING GIN(modality);
CREATE INDEX idx_professionals_specialties ON professionals USING GIN(specialties);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  whatsapp TEXT,
  country TEXT NOT NULL,
  city TEXT,
  online_ok BOOLEAN DEFAULT true,
  modality_preference TEXT[],
  budget_min INTEGER,
  budget_max INTEGER,
  currency TEXT DEFAULT 'USD',
  intent_tags TEXT[] NOT NULL,
  style_preference TEXT[],
  urgency TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new','matched','contacted','converted','closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tracking_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_matches_lead_id ON matches(lead_id);
CREATE INDEX idx_matches_tracking_code ON matches(tracking_code);

CREATE TABLE match_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank IN (1,2,3)),
  reasons TEXT[],
  attribution_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, professional_id),
  UNIQUE(match_id, rank)
);

CREATE INDEX idx_match_recommendations_match ON match_recommendations(match_id);
CREATE INDEX idx_match_recommendations_professional ON match_recommendations(professional_id);

-- ==========================================
-- EVENTS (PARTITIONED)
-- ==========================================

CREATE TABLE events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'lead_submitted','match_created','match_sent','profile_view','contact_click','feedback_submitted'
  )),
  match_id UUID,
  professional_id UUID,
  lead_id UUID,
  tracking_code TEXT NOT NULL,
  fingerprint_hash TEXT,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- DEFAULT partition (safety net)
CREATE TABLE events_default PARTITION OF events DEFAULT;

-- Dynamic partition creation for current + next 2 months
DO $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
  i INTEGER;
BEGIN
  FOR i IN 0..2 LOOP
    start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::INTERVAL)::DATE;
    end_date := date_trunc('month', CURRENT_DATE + ((i+1) || ' months')::INTERVAL)::DATE;
    partition_name := 'events_' || to_char(start_date, 'YYYY_MM');

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF events FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date::TIMESTAMPTZ, end_date::TIMESTAMPTZ
    );

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_type ON %I(event_type)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_match ON %I(match_id)', partition_name, partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_pro ON %I(professional_id)', partition_name, partition_name);

    RAISE NOTICE 'Created partition: % (% to %)', partition_name, start_date, end_date;
  END LOOP;
END $$;

-- ==========================================
-- PQLs (APPEND-ONLY BILLING)
-- ==========================================

CREATE TABLE pqls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  event_id UUID NOT NULL,  -- Logical reference (no FK due to partitioning)
  event_created_at TIMESTAMPTZ NOT NULL,  -- For audit integrity verification
  tracking_code TEXT NOT NULL,
  billing_month DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status = 'active'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, professional_id)
);

CREATE INDEX idx_pqls_professional_billing ON pqls(professional_id, billing_month);
CREATE INDEX idx_pqls_event_id ON pqls(event_id);
CREATE INDEX idx_pqls_event_composite ON pqls(event_id, event_created_at);

CREATE TABLE pql_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pql_id UUID NOT NULL REFERENCES pqls(id),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('waive','dispute','refund','restore')),
  reason TEXT NOT NULL,
  billing_month DATE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pql_adjustments_pql ON pql_adjustments(pql_id);

-- ==========================================
-- RLS POLICIES (STRICT LOCKDOWN)
-- ==========================================

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pqls ENABLE ROW LEVEL SECURITY;
ALTER TABLE pql_adjustments ENABLE ROW LEVEL SECURITY;

-- Public read active profiles only
CREATE POLICY "Public read active" ON professionals FOR SELECT
TO anon, authenticated USING (status = 'active');

-- Deny all writes to billing-critical tables
CREATE POLICY "Deny all" ON events FOR ALL TO anon,authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all" ON pqls FOR ALL TO anon,authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all" ON pql_adjustments FOR ALL TO anon,authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all" ON match_recommendations FOR ALL TO anon,authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all" ON matches FOR ALL TO anon,authenticated USING (false) WITH CHECK (false);

-- ==========================================
-- TRIGGERS
-- ==========================================

CREATE FUNCTION create_pql_from_contact_click()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.event_type = 'contact_click' THEN
    INSERT INTO pqls (match_id, lead_id, professional_id, event_id, event_created_at, tracking_code, billing_month)
    VALUES (NEW.match_id, NEW.lead_id, NEW.professional_id, NEW.id, NEW.created_at, NEW.tracking_code,
            date_trunc('month', NEW.created_at)::date)
    ON CONFLICT (match_id, professional_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trigger_create_pql
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION create_pql_from_contact_click();

REVOKE EXECUTE ON FUNCTION create_pql_from_contact_click() FROM PUBLIC;

-- ==========================================
-- OPERATIONAL FUNCTIONS
-- ==========================================

-- Partition creation
CREATE FUNCTION create_next_events_partition(target_month DATE)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_partition_name TEXT;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  IF target_month <= date_trunc('month', CURRENT_DATE) THEN
    RAISE EXCEPTION 'Target month must be in the future';
  END IF;

  v_partition_name := 'events_' || to_char(target_month, 'YYYY_MM');
  v_start_date := target_month::timestamptz;
  v_end_date := (target_month + INTERVAL '1 month')::timestamptz;

  EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF events FOR VALUES FROM (%L) TO (%L)',
    v_partition_name, v_start_date, v_end_date);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_type ON %I(event_type)', v_partition_name, v_partition_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_match ON %I(match_id)', v_partition_name, v_partition_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_pro ON %I(professional_id)', v_partition_name, v_partition_name);

  RETURN v_partition_name;
END $$;

REVOKE EXECUTE ON FUNCTION create_next_events_partition FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_next_events_partition TO service_role;

-- Reconciliation: Detect orphan PQLs
CREATE FUNCTION check_pql_event_integrity()
RETURNS TABLE (pql_id UUID, event_id UUID, event_created_at TIMESTAMPTZ, issue TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.event_id, p.event_created_at, 'Orphan PQL: event not found'::TEXT
  FROM pqls p
  WHERE NOT EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = p.event_id AND e.created_at = p.event_created_at
  );
END $$;

REVOKE EXECUTE ON FUNCTION check_pql_event_integrity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_pql_event_integrity() TO service_role;

-- Retention policy
CREATE FUNCTION purge_old_events()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  deleted_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  DELETE FROM events
  WHERE created_at < NOW() - INTERVAL '3 months'
    AND event_type NOT IN ('contact_click','lead_submitted','match_created');
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;

  DELETE FROM events
  WHERE created_at < NOW() - INTERVAL '12 months'
    AND event_type = 'contact_click';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;

  RETURN deleted_count;
END $$;

REVOKE EXECUTE ON FUNCTION purge_old_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_old_events() TO service_role;
