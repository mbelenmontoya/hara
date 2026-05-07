-- Migration 010: Holistic Practices Catalog
--
-- Replaces the hardcoded STYLE_MAP / STYLES / STYLE_OPTIONS TypeScript
-- constants with a DB-driven `practices` table. Renames the style[] columns
-- on professionals and leads to practices[] / practice_preference[].
-- Marks all existing professionals for admin re-classification.
--
-- Naming note: the PRD originally proposed `modalities` but that name
-- collides with the existing `professionals.modality TEXT[]` (online/presencial
-- format) and `leads.modality_preference TEXT[]`. Column name `practices`
-- was chosen to disambiguate. The 15 seed values are unchanged.
--
-- Operation order (all inside one transaction):
--   1. Create `practices` lookup table
--   2. Seed 15 canonical practices
--   3. Rename professionals.style → professionals.practices
--   4. Rename leads.style_preference → leads.practice_preference
--   5. Clear all professionals.practices values (removes legacy psychotherapy keys)
--   6. Set DEFAULT '{}'
--   7. SET NOT NULL (safe now — step 5 guarantees no NULLs)
--   8. Add needs_practice_review column
--   9. Flag all existing professionals for admin re-classification
--
-- Rollback (manual):
--   UPDATE professionals SET needs_practice_review = false;
--   ALTER TABLE professionals DROP COLUMN needs_practice_review;
--   ALTER TABLE professionals ALTER COLUMN practices DROP NOT NULL;
--   ALTER TABLE professionals ALTER COLUMN practices DROP DEFAULT;
--   ALTER TABLE professionals RENAME COLUMN practices TO style;
--   ALTER TABLE leads RENAME COLUMN practice_preference TO style_preference;
--   DROP TABLE IF EXISTS practices;

BEGIN;

-- ============================================================================
-- 1. Create `practices` lookup table
-- ============================================================================

CREATE TABLE IF NOT EXISTS practices (
  key         TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  active      BOOL NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. Seed the 15 canonical holistic practices
-- ============================================================================

INSERT INTO practices (key, label, slug, sort_order) VALUES
  ('reiki',                  'Reiki',                           'reiki',                  10),
  ('constelaciones-familiares', 'Constelaciones familiares',    'constelaciones-familiares', 20),
  ('registros-akashicos',    'Registros akáshicos',             'registros-akashicos',    30),
  ('diseno-humano',          'Diseño humano',                   'diseno-humano',          40),
  ('terapia-floral',         'Terapia floral (Flores de Bach)', 'terapia-floral',         50),
  ('masaje-terapeutico',     'Masaje terapéutico',              'masaje-terapeutico',     60),
  ('meditacion-mindfulness', 'Meditación y mindfulness',        'meditacion-mindfulness', 70),
  ('biodecodificacion',      'Biodecodificación',               'biodecodificacion',      80),
  ('sonoterapia',            'Sonoterapia',                     'sonoterapia',            90),
  ('tarot-terapeutico',      'Tarot terapéutico',               'tarot-terapeutico',      100),
  ('astrologia',             'Astrología',                      'astrologia',             110),
  ('coaching-ontologico',    'Coaching ontológico',             'coaching-ontologico',    120),
  ('aromaterapia',           'Aromaterapia',                    'aromaterapia',           130),
  ('yoga-terapeutico',       'Yoga terapéutico',                'yoga-terapeutico',       140),
  ('terapia-energetica',     'Terapia energética (otras)',      'terapia-energetica',     150)
ON CONFLICT (key) DO NOTHING;

-- Grant service_role read access (anon is fine too for public catalog data)
GRANT SELECT ON practices TO service_role;
GRANT SELECT ON practices TO anon;

-- ============================================================================
-- 3. Rename professionals.style → professionals.practices
-- ============================================================================

ALTER TABLE professionals RENAME COLUMN style TO practices;

-- ============================================================================
-- 4. Rename leads.style_preference → leads.practice_preference
-- ============================================================================

ALTER TABLE leads RENAME COLUMN style_preference TO practice_preference;

-- ============================================================================
-- 5. Clear all existing practices values
--    (Removes legacy psychotherapy keys; leaves column as NULL or empty)
--    This MUST run before SET NOT NULL so no pre-existing NULLs remain.
-- ============================================================================

UPDATE professionals SET practices = '{}';

-- ============================================================================
-- 6. Set DEFAULT '{}' on the renamed column
-- ============================================================================

ALTER TABLE professionals ALTER COLUMN practices SET DEFAULT '{}';

-- ============================================================================
-- 7. Promote to NOT NULL
--    Safe now — step 5 guarantees every row has practices = '{}'.
-- ============================================================================

ALTER TABLE professionals ALTER COLUMN practices SET NOT NULL;

-- ============================================================================
-- 8. Add needs_practice_review flag
-- ============================================================================

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS needs_practice_review BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================================
-- 9. Flag all existing professionals for admin re-classification
-- ============================================================================

UPDATE professionals SET needs_practice_review = TRUE;

COMMIT;

-- Rollback (manual — run these statements in order if migration must be undone):
-- BEGIN;
-- UPDATE professionals SET needs_practice_review = FALSE;
-- ALTER TABLE professionals DROP COLUMN needs_practice_review;
-- ALTER TABLE professionals ALTER COLUMN practices DROP NOT NULL;
-- ALTER TABLE professionals ALTER COLUMN practices DROP DEFAULT;
-- ALTER TABLE professionals RENAME COLUMN practices TO style;
-- ALTER TABLE leads RENAME COLUMN practice_preference TO style_preference;
-- DROP TABLE IF EXISTS practices;
-- COMMIT;
