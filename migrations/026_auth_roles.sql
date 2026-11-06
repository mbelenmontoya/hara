-- Migration 026: Roles in Supabase Auth (app_metadata.role)
-- Access is decided by the role on the auth user (middleware.ts, lib/require-admin.ts):
--   'admin'        → /admin and /api/admin
--   'professional' → /pro and /api/pro
-- New professionals get their role when they are invited (lib/pro-invite.ts). This migration gives it
-- to the professionals who already have a login (professionals.user_id). It never touches an admin.
-- app_metadata lives in auth.users.raw_app_meta_data and only the service role / SQL editor can write it.
-- Applied via Supabase SQL Editor (same as migrations 004-025). Safe to run more than once.
--
-- The admin's own role is NOT set here (it would put a personal email in the repo). Run once, with your email:
--   UPDATE auth.users
--   SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
--   WHERE email = 'your-admin-email@example.com';
--
-- Rollback:
--   UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data - 'role'
--   WHERE raw_app_meta_data->>'role' = 'professional';

BEGIN;

UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"professional"}'::jsonb
WHERE id IN (SELECT user_id FROM professionals WHERE user_id IS NOT NULL)
  AND coalesce(raw_app_meta_data->>'role', '') <> 'admin';

COMMIT;
