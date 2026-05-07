-- Migration 008: Heartbeat table
-- Keeps the Hara Supabase free-tier project from auto-pausing.
-- Pinged every 3 days (cron: 0 13 */3 * *) by the n8n workflow `Hara — Heartbeat`
-- at https://n8n.greenbit.info. */3 (not */6) leaves a 4-day buffer against the
-- 7-day auto-pause threshold at month boundaries.
--
-- Mirrors automation/migrations/001_initial_schema.sql §9 exactly.
-- No RLS — service-role-only writes from n8n.

CREATE TABLE heartbeat (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pinged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
