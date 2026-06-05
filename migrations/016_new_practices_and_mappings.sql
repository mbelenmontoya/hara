-- 016_new_practices_and_mappings.sql
--
-- 1. Insert 14 new holistic practices into the catalog
-- 2. Add aliases to existing 15 practices for the free-text entries professionals used
-- 3. Dismiss irrelevant entries from all professionals' specialties
--
-- Safe to re-run (INSERT ... ON CONFLICT DO NOTHING, array_append only adds if not present).

-- ============================================================================
-- 0. ENSURE COLUMNS EXIST (idempotent guards for 012 + 013 not yet applied)
-- ============================================================================

ALTER TABLE practices ADD COLUMN IF NOT EXISTS specialties text[] NOT NULL DEFAULT '{}';
ALTER TABLE practices ADD COLUMN IF NOT EXISTS aliases    text[] NOT NULL DEFAULT '{}';

-- ============================================================================
-- 1. NEW PRACTICES
-- ============================================================================

INSERT INTO practices (key, label, slug, sort_order, specialties) VALUES
  ('barras-de-access',       'Barras de Access',          'barras-de-access',       160, ARRAY['estres-ansiedad','bloqueos-emocionales','equilibrio-energetico']),
  ('cristaloterapia',        'Cristaloterapia',            'cristaloterapia',         170, ARRAY['equilibrio-energetico','bloqueos-emocionales','estres-ansiedad']),
  ('radiestesia',            'Radiestesia',                'radiestesia',             180, ARRAY['autoconocimiento','equilibrio-energetico','bloqueos-emocionales']),
  ('numerologia',            'Numerología',                'numerologia',             190, ARRAY['autoconocimiento','proposito-vida','transiciones-vitales']),
  ('kinesiologia-holistica', 'Kinesiología holística',     'kinesiologia-holistica',  200, ARRAY['bloqueos-emocionales','estres-ansiedad','equilibrio-energetico','trauma-heridas']),
  ('biomagnetismo',          'Biomagnetismo',              'biomagnetismo',           210, ARRAY['estres-ansiedad','equilibrio-energetico','bloqueos-emocionales']),
  ('terapia-transpersonal',  'Terapia transpersonal',      'terapia-transpersonal',   220, ARRAY['bloqueos-emocionales','autoconocimiento','trauma-heridas','proposito-vida']),
  ('psicogenealogia',        'Psicogenealogía',            'psicogenealogia',         230, ARRAY['familia-linaje','trauma-heridas','vinculos-relaciones','bloqueos-emocionales']),
  ('acupuntura',             'Acupuntura',                 'acupuntura',              240, ARRAY['estres-ansiedad','equilibrio-energetico','bloqueos-emocionales']),
  ('canalizaciones',         'Canalizaciones',             'canalizaciones',          250, ARRAY['autoconocimiento','proposito-vida','equilibrio-energetico']),
  ('videncia',               'Videncia',                   'videncia',                260, ARRAY['autoconocimiento','proposito-vida','transiciones-vitales']),
  ('runas',                  'Runas',                      'runas',                   270, ARRAY['autoconocimiento','proposito-vida','transiciones-vitales','miedos-creencias']),
  ('reflexologia',           'Reflexología',               'reflexologia',            280, ARRAY['estres-ansiedad','equilibrio-energetico','bloqueos-emocionales']),
  ('fitoterapia',            'Fitoterapia',                'fitoterapia',             290, ARRAY['estres-ansiedad','equilibrio-energetico'])
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 2. ALIASES — existing 15 practices
--    array_append with guard: only adds if not already present
-- ============================================================================

-- reiki
UPDATE practices SET aliases = array_append(aliases, 'equilibrio chakras')
  WHERE key = 'reiki' AND NOT 'equilibrio chakras' = ANY(aliases);

-- constelaciones-familiares
UPDATE practices SET aliases = array_append(aliases, 'sanaciones ancestrales')
  WHERE key = 'constelaciones-familiares' AND NOT 'sanaciones ancestrales' = ANY(aliases);

-- biodecodificacion
UPDATE practices SET aliases = array_append(aliases, 'bioneurodesprogramacion')
  WHERE key = 'biodecodificacion' AND NOT 'bioneurodesprogramacion' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'reprogramacion de memoria celular')
  WHERE key = 'biodecodificacion' AND NOT 'reprogramacion de memoria celular' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'reprogramacion espiritual')
  WHERE key = 'biodecodificacion' AND NOT 'reprogramacion espiritual' = ANY(aliases);

-- astrologia
UPDATE practices SET aliases = array_append(aliases, 'astrologia maya')
  WHERE key = 'astrologia' AND NOT 'astrologia maya' = ANY(aliases);

-- coaching-ontologico
UPDATE practices SET aliases = array_append(aliases, 'coaching comunicacional')
  WHERE key = 'coaching-ontologico' AND NOT 'coaching comunicacional' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'coaching integral')
  WHERE key = 'coaching-ontologico' AND NOT 'coaching integral' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'coaching sistemico')
  WHERE key = 'coaching-ontologico' AND NOT 'coaching sistemico' = ANY(aliases);

-- sonoterapia
UPDATE practices SET aliases = array_append(aliases, 'gongplayer')
  WHERE key = 'sonoterapia' AND NOT 'gongplayer' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'terapeuta de sonido')
  WHERE key = 'sonoterapia' AND NOT 'terapeuta de sonido' = ANY(aliases);

-- aromaterapia
UPDATE practices SET aliases = array_append(aliases, 'psicoaromaterapia')
  WHERE key = 'aromaterapia' AND NOT 'psicoaromaterapia' = ANY(aliases);

-- yoga-terapeutico
UPDATE practices SET aliases = array_append(aliases, 'movimientos conscientes')
  WHERE key = 'yoga-terapeutico' AND NOT 'movimientos conscientes' = ANY(aliases);

-- terapia-energetica
UPDATE practices SET aliases = array_append(aliases, 'armonizacion energetica')
  WHERE key = 'terapia-energetica' AND NOT 'armonizacion energetica' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'sanación')
  WHERE key = 'terapia-energetica' AND NOT 'sanación' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'sanacion cuantica')
  WHERE key = 'terapia-energetica' AND NOT 'sanacion cuantica' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'sanacion de espacios')
  WHERE key = 'terapia-energetica' AND NOT 'sanacion de espacios' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'sanacion ancestral celta')
  WHERE key = 'terapia-energetica' AND NOT 'sanacion ancestral celta' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'sanacion benedictina')
  WHERE key = 'terapia-energetica' AND NOT 'sanacion benedictina' = ANY(aliases);

-- ============================================================================
-- 3. ALIASES — new practices
-- ============================================================================

-- cristaloterapia
UPDATE practices SET aliases = array_append(aliases, 'gemoterapia')
  WHERE key = 'cristaloterapia' AND NOT 'gemoterapia' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'cristales')
  WHERE key = 'cristaloterapia' AND NOT 'cristales' = ANY(aliases);

-- radiestesia
UPDATE practices SET aliases = array_append(aliases, 'terapia de pendulo')
  WHERE key = 'radiestesia' AND NOT 'terapia de pendulo' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'pendulo esenio')
  WHERE key = 'radiestesia' AND NOT 'pendulo esenio' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'pendulo hebreo')
  WHERE key = 'radiestesia' AND NOT 'pendulo hebreo' = ANY(aliases);

-- numerologia
UPDATE practices SET aliases = array_append(aliases, 'numerologia terapeutica')
  WHERE key = 'numerologia' AND NOT 'numerologia terapeutica' = ANY(aliases);

-- acupuntura
UPDATE practices SET aliases = array_append(aliases, 'acupuntura bioenergetica')
  WHERE key = 'acupuntura' AND NOT 'acupuntura bioenergetica' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'medicina china')
  WHERE key = 'acupuntura' AND NOT 'medicina china' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'medicina tradicional china')
  WHERE key = 'acupuntura' AND NOT 'medicina tradicional china' = ANY(aliases);

-- runas
UPDATE practices SET aliases = array_append(aliases, 'runas nordicas')
  WHERE key = 'runas' AND NOT 'runas nordicas' = ANY(aliases);
UPDATE practices SET aliases = array_append(aliases, 'runas brujas')
  WHERE key = 'runas' AND NOT 'runas brujas' = ANY(aliases);

-- reflexologia
UPDATE practices SET aliases = array_append(aliases, 'reflexologia podal')
  WHERE key = 'reflexologia' AND NOT 'reflexologia podal' = ANY(aliases);

-- ============================================================================
-- 4. DISMISS — remove irrelevant entries from all professionals' specialties
-- ============================================================================

SELECT dismiss_specialty_suggestion('cursos');
SELECT dismiss_specialty_suggestion('mentoria');
SELECT dismiss_specialty_suggestion('mentoring');
SELECT dismiss_specialty_suggestion('bienestar mental');
SELECT dismiss_specialty_suggestion('espiritualidad');
SELECT dismiss_specialty_suggestion('psicoterapia');
SELECT dismiss_specialty_suggestion('terapia ocupacional');
SELECT dismiss_specialty_suggestion('hidroterapia colonica');
SELECT dismiss_specialty_suggestion('medicina integrativa');
SELECT dismiss_specialty_suggestion('nutricion');
SELECT dismiss_specialty_suggestion('psicoemocional');
SELECT dismiss_specialty_suggestion('terapia psicoespiritual');
SELECT dismiss_specialty_suggestion('terapias artisticas');
SELECT dismiss_specialty_suggestion('mesa radionica cuantica');
SELECT dismiss_specialty_suggestion('velomancia');
SELECT dismiss_specialty_suggestion('expresion corporal');
SELECT dismiss_specialty_suggestion('auricuoterapia');
SELECT dismiss_specialty_suggestion('i ching');
