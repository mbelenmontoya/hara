-- Migration 018: Add reviewer_email to reviews table
-- Enables per-email duplicate prevention on open review submissions.
-- Nullable to preserve existing token-gated reviews (they have no email).

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_email TEXT;

-- Index for fast duplicate-check lookups (professional_id + reviewer_email)
CREATE INDEX IF NOT EXISTS reviews_professional_email_idx
  ON reviews (professional_id, reviewer_email)
  WHERE reviewer_email IS NOT NULL AND is_hidden = false;
