-- Hará Match — Pre-launch waitlist
-- Used by the homepage "Próximamente" form so visitors (mostly professionals
-- interested in joining) can leave their email before the directory opens.
--
-- Apply via: Supabase dashboard → SQL Editor → paste this file → Run

CREATE TABLE IF NOT EXISTS waitlist (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL UNIQUE,
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created
  ON waitlist (created_at DESC);

-- RLS: deny-all — only service_role writes via /api/waitlist
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all" ON waitlist;
CREATE POLICY "Deny all" ON waitlist
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "Deny all" ON waitlist;
-- DROP INDEX IF EXISTS idx_waitlist_created;
-- DROP TABLE IF EXISTS waitlist;
