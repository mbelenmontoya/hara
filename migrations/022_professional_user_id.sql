-- Migration 022: Link professionals to Supabase Auth users
-- Adds user_id column so approved professionals can authenticate and self-manage their profile.
-- Applied via Supabase SQL Editor (same as migrations 004-021).
--
-- Rollback:
--   DROP INDEX IF EXISTS idx_professionals_user_id;
--   ALTER TABLE professionals DROP COLUMN IF EXISTS user_id;

-- Add user_id column referencing auth.users.
-- ON DELETE SET NULL: deleting the auth user nulls the link but preserves the professional row.
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Unique partial index: one auth user ↔ one professional row.
-- WHERE user_id IS NOT NULL prevents the unique constraint from blocking multiple NULL rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_user_id
  ON professionals(user_id)
  WHERE user_id IS NOT NULL;
