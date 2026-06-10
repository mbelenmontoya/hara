-- Migration 022: Professional Coordinates
--
-- Adds nullable latitude/longitude columns to `professionals` so location
-- coordinates can be stored going forward. No backfill — existing rows keep
-- NULL and the map falls back to client-side city-centroid geocoding.
-- New registrations capture coords from the PlacesAutocomplete (which already
-- returns lat/lng) and store them here.
--
-- Rollback (manual):
--   ALTER TABLE professionals
--     DROP COLUMN IF EXISTS latitude,
--     DROP COLUMN IF EXISTS longitude;

BEGIN;

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

COMMIT;
