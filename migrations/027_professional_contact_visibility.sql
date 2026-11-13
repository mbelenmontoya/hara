-- Keep contact information available internally and control publication per channel.
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS show_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_whatsapp boolean NOT NULL DEFAULT true;

-- Public pages and recommendations use the server client to apply visibility.
-- Direct Data API reads must never return the stored contact values.
REVOKE SELECT ON public.professionals FROM PUBLIC, anon, authenticated;
REVOKE SELECT (email, whatsapp) ON public.professionals FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, slug, status, full_name, country, city, online_only, modality, specialties,
  practices, price_range_min, price_range_max, currency, accepting_new_clients, bio,
  profile_image_url, created_at, updated_at, instagram, short_description,
  experience_description, service_type, offers_courses_online, courses_presencial_location,
  rejection_reason, profile_completeness_score, rating_average, rating_count,
  subscription_tier, ranking_score, tier_expires_at, needs_practice_review, resubmit_after,
  score_overrides, latitude, longitude, user_id, admin_read_at
) ON public.professionals TO anon, authenticated;
