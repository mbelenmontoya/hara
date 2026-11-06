-- Migration 025: Remember what the admin has opened
-- Adds admin_read_at to leads, professionals, blog_posts and reviews. NULL means unread.
-- The admin menu shows how many rows are still NULL (lib/admin-unread.ts, /api/admin/unread).
-- A lead, professional or blog note is marked read when the admin opens its detail page;
-- reviews are marked read when the admin opens /admin/reviews.
-- Every row that exists today is marked read, so the numbers start at 0.
-- Applied via Supabase SQL Editor (same as migrations 004-024).
--
-- Rollback:
--   ALTER TABLE leads DROP COLUMN IF EXISTS admin_read_at;
--   ALTER TABLE professionals DROP COLUMN IF EXISTS admin_read_at;
--   ALTER TABLE blog_posts DROP COLUMN IF EXISTS admin_read_at;
--   ALTER TABLE reviews DROP COLUMN IF EXISTS admin_read_at;

BEGIN;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS admin_read_at TIMESTAMPTZ;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS admin_read_at TIMESTAMPTZ;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS admin_read_at TIMESTAMPTZ;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_read_at TIMESTAMPTZ;

UPDATE leads SET admin_read_at = now() WHERE admin_read_at IS NULL;
UPDATE professionals SET admin_read_at = now() WHERE admin_read_at IS NULL;
UPDATE blog_posts SET admin_read_at = now() WHERE admin_read_at IS NULL;
UPDATE reviews SET admin_read_at = now() WHERE admin_read_at IS NULL;

COMMIT;
