-- Migration 021: Blog Posts
--
-- Creates the `blog_posts` table that backs the blog feature:
--   - Public submission form → admin moderation queue → published
--   - Status workflow: submitted → published | rejected
--   - `professional_link_confirmed` guards the impersonation vector:
--     email-match auto-link is tentative until an admin explicitly confirms it
--
-- Also creates the public `blog-images` Supabase Storage bucket.
-- NOTE: If `profile-images` was created via the Supabase dashboard in your
-- project, create `blog-images` the same way (Storage → Buckets → New bucket,
-- name: "blog-images", public: on). The SQL below handles it programmatically
-- if storage.buckets is accessible from migrations.
--
-- Rollback (manual):
--   DROP TABLE IF EXISTS blog_posts;
--   DELETE FROM storage.buckets WHERE id = 'blog-images';
--   -- Also drop any storage policy named "Public blog-images read"

BEGIN;

-- ============================================================================
-- 1. Create `blog_posts` table
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                      TEXT        UNIQUE NOT NULL,
  status                    TEXT        NOT NULL DEFAULT 'submitted'
                                        CHECK (status IN ('submitted', 'published', 'rejected')),
  title                     TEXT        NOT NULL,
  body_html                 TEXT        NOT NULL,
  excerpt                   TEXT,
  author_name               TEXT        NOT NULL,
  author_email              TEXT        NOT NULL,
  professional_id           UUID        REFERENCES professionals(id) ON DELETE SET NULL,
  professional_link_confirmed BOOLEAN   NOT NULL DEFAULT false,
  cover_image_url           TEXT,
  secondary_image_url       TEXT,
  rejection_reason          TEXT,
  published_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. Indexes
-- ============================================================================

-- Status index — used by admin queue and public pages filtering by status
CREATE INDEX IF NOT EXISTS idx_blog_posts_status
  ON blog_posts(status);

-- Professional index — used by Task 9 (profile → posts query)
CREATE INDEX IF NOT EXISTS idx_blog_posts_professional
  ON blog_posts(professional_id);

-- Composite for the public index: status + published_at DESC — covers the
-- filtered + sorted query for the /blog listing page
CREATE INDEX IF NOT EXISTS idx_blog_posts_published
  ON blog_posts(status, published_at DESC);

-- ============================================================================
-- 3. blog-images storage bucket (public read)
-- ============================================================================

-- Insert the bucket if it doesn't already exist.
-- If your Supabase project does not allow DDL on storage.buckets via migrations,
-- create the bucket manually: Storage → Buckets → New → name: "blog-images", public: on
INSERT INTO storage.buckets (id, name, public)
  VALUES ('blog-images', 'blog-images', true)
  ON CONFLICT (id) DO NOTHING;

-- Public read policy: anyone can read images (needed for <img> tags without auth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Public blog-images read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Public blog-images read"
        ON storage.objects
        FOR SELECT
        USING (bucket_id = 'blog-images')
    $policy$;
  END IF;
END
$$;

-- Service role write policy: only the backend service role (no auth.uid) can upload images.
-- auth.uid() IS NULL is true for service-role requests (they bypass RLS entirely but this
-- guard ensures anon/authenticated users cannot upload even if RLS is accidentally enabled).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Service role blog-images write'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Service role blog-images write"
        ON storage.objects
        FOR INSERT
        WITH CHECK (bucket_id = 'blog-images' AND (auth.role() = 'service_role' OR auth.uid() IS NULL))
    $policy$;
  END IF;
END
$$;

COMMIT;

-- Rollback (manual — run in order if migration must be undone):
-- BEGIN;
-- DROP INDEX IF EXISTS idx_blog_posts_published;
-- DROP INDEX IF EXISTS idx_blog_posts_professional;
-- DROP INDEX IF EXISTS idx_blog_posts_status;
-- DROP TABLE IF EXISTS blog_posts;
-- DELETE FROM storage.buckets WHERE id = 'blog-images';
-- DROP POLICY IF EXISTS "Public blog-images read" ON storage.objects;
-- DROP POLICY IF EXISTS "Service role blog-images write" ON storage.objects;
-- COMMIT;
