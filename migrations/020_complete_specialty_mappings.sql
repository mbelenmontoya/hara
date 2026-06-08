-- 020_complete_specialty_mappings.sql
--
-- Safety-net migration: fills empty `specialties` arrays on all 29 known practices.
-- Uses `AND specialties = '{}'` so admin-curated mappings set via the edit form are
-- NEVER overwritten. Only practices created via the admin UI before the POST-route
-- fix (migration 020) — which silently dropped specialties — are affected.
--
-- Research basis: each practice mapped to the SPECIALTY_MAP keys that best reflect
-- its documented therapeutic applications in holistic / energy-healing literature.
-- Mappings are identical to migrations 015 and 016 for the 29 known practices.
-- Safe to re-run (idempotent — WHERE specialties = '{}' no-ops on already-mapped rows).

-- ── Original 15 practices (from migration 010) ────────────────────────────────

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','bloqueos-emocionales','equilibrio-energetico','duelo-perdidas','trauma-heridas'
] WHERE key = 'reiki' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'familia-linaje','vinculos-relaciones','pareja','duelo-perdidas','trauma-heridas','bloqueos-emocionales'
] WHERE key = 'constelaciones-familiares' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'autoconocimiento','proposito-vida','miedos-creencias','bloqueos-emocionales','transiciones-vitales'
] WHERE key = 'registros-akashicos' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'autoconocimiento','proposito-vida','vinculos-relaciones','transiciones-vitales'
] WHERE key = 'diseno-humano' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','bloqueos-emocionales','duelo-perdidas','miedos-creencias','transiciones-vitales'
] WHERE key = 'terapia-floral' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico'
] WHERE key = 'masaje-terapeutico' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico','bloqueos-emocionales','autoconocimiento'
] WHERE key = 'meditacion-mindfulness' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'trauma-heridas','familia-linaje','bloqueos-emocionales','miedos-creencias'
] WHERE key = 'biodecodificacion' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico','bloqueos-emocionales','duelo-perdidas','trauma-heridas'
] WHERE key = 'sonoterapia' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'autoconocimiento','vinculos-relaciones','miedos-creencias','transiciones-vitales'
] WHERE key = 'tarot-terapeutico' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'autoconocimiento','proposito-vida','transiciones-vitales'
] WHERE key = 'astrologia' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'autoconocimiento','proposito-vida','vinculos-relaciones','miedos-creencias','transiciones-vitales','pareja'
] WHERE key = 'coaching-ontologico' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico'
] WHERE key = 'aromaterapia' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico','bloqueos-emocionales','autoconocimiento'
] WHERE key = 'yoga-terapeutico' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico','bloqueos-emocionales','duelo-perdidas','trauma-heridas'
] WHERE key = 'terapia-energetica' AND specialties = '{}';

-- ── 14 new practices (from migration 016) ─────────────────────────────────────

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','bloqueos-emocionales','equilibrio-energetico'
] WHERE key = 'barras-de-access' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'equilibrio-energetico','bloqueos-emocionales','estres-ansiedad'
] WHERE key = 'cristaloterapia' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'autoconocimiento','equilibrio-energetico','bloqueos-emocionales'
] WHERE key = 'radiestesia' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'autoconocimiento','proposito-vida','transiciones-vitales'
] WHERE key = 'numerologia' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'bloqueos-emocionales','estres-ansiedad','equilibrio-energetico','trauma-heridas'
] WHERE key = 'kinesiologia-holistica' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico','bloqueos-emocionales'
] WHERE key = 'biomagnetismo' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'bloqueos-emocionales','autoconocimiento','trauma-heridas','proposito-vida'
] WHERE key = 'terapia-transpersonal' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'familia-linaje','trauma-heridas','vinculos-relaciones','bloqueos-emocionales'
] WHERE key = 'psicogenealogia' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico','bloqueos-emocionales'
] WHERE key = 'acupuntura' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'autoconocimiento','proposito-vida','equilibrio-energetico'
] WHERE key = 'canalizaciones' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'autoconocimiento','proposito-vida','transiciones-vitales'
] WHERE key = 'videncia' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'autoconocimiento','proposito-vida','transiciones-vitales','miedos-creencias'
] WHERE key = 'runas' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico','bloqueos-emocionales'
] WHERE key = 'reflexologia' AND specialties = '{}';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico'
] WHERE key = 'fitoterapia' AND specialties = '{}';
