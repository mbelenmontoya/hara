-- Hará Match — Destacado Tier MVP
-- Purpose: Add tier_expires_at column, subscription_payments table, and update
--          recompute_ranking() trigger to respect tier expiry.
--          Adds upgrade_destacado_tier() RPC for atomic payment recording + tier update.
--
-- Builds on migration 004 (ranking_foundation) — apply 004 first.
-- Apply via: node scripts/apply-destacado-migration.mjs
--        or: Supabase dashboard → SQL Editor → paste this file → Run

-- ─── 1. tier_expires_at on professionals ─────────────────────────────────────

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMPTZ;

-- Partial index: only destacado rows need fast lookup for the cron cleanup query.
-- CREATE INDEX IF NOT EXISTS is idempotent (TS-006 re-apply test).
CREATE INDEX IF NOT EXISTS idx_professionals_tier_expires
  ON professionals (tier_expires_at)
  WHERE subscription_tier = 'destacado';

-- ─── 2. subscription_payments table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_payments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id   UUID        NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  amount            NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency          TEXT        NOT NULL CHECK (currency IN ('ARS', 'USD')),
  paid_at           TIMESTAMPTZ NOT NULL,
  -- period_start..period_end are INCLUSIVE on both ends.
  -- A "Jun 1 to Jun 30" purchase = 30 days of service.
  -- Duration is computed as (period_end - period_start + 1) — see upgrade_destacado_tier().
  period_start      DATE        NOT NULL,
  period_end        DATE        NOT NULL,
  payment_method    TEXT        NOT NULL CHECK (payment_method IN ('mp_link', 'transferencia', 'efectivo', 'otro')),
  invoice_number    TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID,
  CONSTRAINT subscription_payments_period_check CHECK (period_end > period_start)
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_professional
  ON subscription_payments (professional_id, paid_at DESC);

-- ─── 2b. RLS — fail-closed (mirrors 001_schema.sql pattern for billing tables) ─
-- subscription_payments holds private financial data. Only service_role writes
-- (via /api/admin/subscriptions). All anon/authenticated access is denied.

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all" ON subscription_payments;
CREATE POLICY "Deny all" ON subscription_payments
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ─── 3. Updated recompute_ranking() — expiry-aware tier contribution ─────────
--
-- CHANGE from migration 004: the v_tier_contrib CASE expression now includes
--   AND (NEW.tier_expires_at IS NULL OR NEW.tier_expires_at > NOW())
-- All 10 completeness criteria are identical to migration 004 — do not alter them.
--
-- Backward compat (fixture 5 in ranking-parity.test.ts):
--   tier='destacado' with tier_expires_at IS NULL → contribution = 100 (legacy rows).
--
-- TS mirror: lib/ranking.ts computeTierContribution(tier, tierExpiresAt?)
--   must be kept in sync with this expression.

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
  -- profileImage (15 pts) — unchanged from migration 004
  IF NEW.profile_image_url IS NOT NULL AND length(trim(NEW.profile_image_url)) > 0 THEN
    v_completeness := v_completeness + 15;
  END IF;

  -- shortDescription (10 pts)
  IF NEW.short_description IS NOT NULL AND length(trim(NEW.short_description)) > 0 THEN
    v_completeness := v_completeness + 10;
  END IF;

  -- bio (15 pts) — requires at least 50 chars after trim
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

  NEW.profile_completeness_score := v_completeness;

  -- Rating contribution (0–100 pts before weight) — unchanged from migration 004
  v_rating_contrib := CASE
    WHEN NEW.rating_count > 0 THEN LEAST(NEW.rating_average * 20, 100)
    ELSE 0
  END;

  -- Tier contribution — NEW: respects expiry (changed from migration 004)
  -- IS NULL branch preserves backward compat for legacy destacado rows without an expiry.
  v_tier_contrib := CASE
    WHEN NEW.subscription_tier = 'destacado'
      AND (NEW.tier_expires_at IS NULL OR NEW.tier_expires_at > NOW())
    THEN 100
    ELSE 0
  END;

  NEW.ranking_score := round(
    0.7 * v_completeness
    + 0.2 * v_rating_contrib
    + 0.1 * v_tier_contrib,
    2
  );

  RETURN NEW;
END;
$$;

-- Trigger: DROP + CREATE (idempotent; see migration 004 for rationale vs CREATE OR REPLACE)
DROP TRIGGER IF EXISTS professionals_recompute_ranking ON professionals;

CREATE TRIGGER professionals_recompute_ranking
  BEFORE INSERT OR UPDATE ON professionals
  FOR EACH ROW EXECUTE FUNCTION recompute_ranking();

-- ─── 4. Atomic RPC: record payment + set/extend Destacado tier ───────────────
--
-- Admin calls this after receiving payment. The RPC:
--   1. Locks the professional row (FOR UPDATE) to prevent concurrent double-extension.
--   2. Computes new tier_expires_at using silent-extension semantics:
--        - If professional currently has a future expiry: extend from there.
--        - Otherwise: use period_end directly.
--      period_days = period_end - period_start (purchased duration, DATE arithmetic).
--      This correctly handles retroactive recording (period_start in the past).
--   3. Inserts subscription_payments row (audit trail).
--   4. Updates professional tier + expiry (trigger re-fires, updates ranking_score).
--
-- Race safety: FOR UPDATE serializes concurrent calls at the row level.
-- Idempotency: calling twice with same inputs creates two payment records (intended).

CREATE OR REPLACE FUNCTION upgrade_destacado_tier(
  p_professional_id   UUID,
  p_amount            NUMERIC,
  p_currency          TEXT,
  p_paid_at           TIMESTAMPTZ,
  p_period_start      DATE,
  p_period_end        DATE,
  p_payment_method    TEXT,
  p_invoice_number    TEXT,
  p_notes             TEXT,
  p_created_by        UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_id        UUID;
  v_current_expiry    TIMESTAMPTZ;
  v_new_expiry        TIMESTAMPTZ;
  v_period_days       INTEGER;
BEGIN
  -- Validate period
  IF p_period_end <= p_period_start THEN
    RAISE EXCEPTION 'period_end must be after period_start';
  END IF;

  -- Lock the professional row to prevent concurrent double-extension
  SELECT tier_expires_at
  INTO v_current_expiry
  FROM professionals
  WHERE id = p_professional_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Professional not found: %', p_professional_id;
  END IF;

  -- Compute purchased duration in days.
  -- INCLUSIVE on both ends: period_start..period_end where Jun 1..Jun 30 = 30 days.
  -- The +1 is REQUIRED for parity with the cold-renewal branch below, which treats
  -- period_end as the last day of service (expiry = midnight ART on period_end + 1).
  -- Without +1, active-tier renewals lose one day per renewal vs cold renewals.
  v_period_days := (p_period_end - p_period_start) + 1;

  -- Silent extension: if currently active (expiry in future), extend from there.
  -- Otherwise, set expiry to end-of-day on period_end in Argentina time
  -- (so a period_end of 2026-05-24 expires at 2026-05-24 23:59:59 ART, not midnight UTC).
  IF v_current_expiry IS NOT NULL AND v_current_expiry > NOW() THEN
    v_new_expiry := v_current_expiry + (v_period_days || ' days')::INTERVAL;
  ELSE
    -- Anchor to end-of-day in ART: midnight UTC on (period_end + 1) - 1 second,
    -- shifted back by Argentina's UTC-3 offset = 03:00 UTC on (period_end + 1).
    v_new_expiry := ((p_period_end + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires');
  END IF;

  -- Insert payment record (audit trail: reflects what admin charged for)
  INSERT INTO subscription_payments (
    professional_id, amount, currency, paid_at,
    period_start, period_end, payment_method,
    invoice_number, notes, created_by
  ) VALUES (
    p_professional_id, p_amount, p_currency, p_paid_at,
    p_period_start, p_period_end, p_payment_method,
    p_invoice_number, p_notes, p_created_by
  )
  RETURNING id INTO v_payment_id;

  -- Update professional tier + expiry; trigger fires and recomputes ranking_score
  UPDATE professionals
  SET subscription_tier = 'destacado',
      tier_expires_at   = v_new_expiry,
      updated_at        = NOW()
  WHERE id = p_professional_id;

  RETURN jsonb_build_object(
    'payment_id',      v_payment_id,
    'professional_id', p_professional_id,
    'tier_expires_at', v_new_expiry
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION upgrade_destacado_tier FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION upgrade_destacado_tier TO service_role;

COMMENT ON FUNCTION upgrade_destacado_tier IS
  'Atomically records a Destacado payment and updates professional tier + expiry. '
  'Handles silent extension (extends from current expiry when still active) and '
  'retroactive recording (period_start may be in the past). '
  'Uses FOR UPDATE row lock to prevent concurrent double-extension.';

-- ─── Rollback (run manually if this migration must be undone) ─────────────────
-- WARNING: After rollback, also restore the migration 004 version of recompute_ranking()
--          from git history (the function still references NEW.tier_expires_at which
--          won't exist after dropping the column).
--
-- REVOKE EXECUTE ON FUNCTION upgrade_destacado_tier FROM PUBLIC;
-- DROP FUNCTION IF EXISTS upgrade_destacado_tier(UUID, NUMERIC, TEXT, TIMESTAMPTZ, DATE, DATE, TEXT, TEXT, TEXT, UUID);
-- DROP INDEX IF EXISTS idx_subscription_payments_professional;
-- DROP TABLE IF EXISTS subscription_payments;
-- DROP INDEX IF EXISTS idx_professionals_tier_expires;
-- ALTER TABLE professionals DROP COLUMN IF EXISTS tier_expires_at;
-- -- Then restore migration 004 recompute_ranking() from git:
-- -- git show HEAD~N:migrations/004_ranking_foundation.sql | psql $SUPABASE_URL
