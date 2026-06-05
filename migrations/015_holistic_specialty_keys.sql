-- 015_holistic_specialty_keys.sql
-- Replaces the old clinical-psychology specialty keys on the practices table
-- with holistic wellness keys that match the updated SPECIALTY_MAP.
-- Safe to re-run (idempotent via explicit WHERE key = '...').

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','bloqueos-emocionales','equilibrio-energetico','duelo-perdidas','trauma-heridas'
] WHERE key = 'reiki';

UPDATE practices SET specialties = ARRAY[
  'familia-linaje','vinculos-relaciones','pareja','duelo-perdidas','trauma-heridas','bloqueos-emocionales'
] WHERE key = 'constelaciones-familiares';

UPDATE practices SET specialties = ARRAY[
  'autoconocimiento','proposito-vida','miedos-creencias','bloqueos-emocionales','transiciones-vitales'
] WHERE key = 'registros-akashicos';

UPDATE practices SET specialties = ARRAY[
  'autoconocimiento','proposito-vida','vinculos-relaciones','transiciones-vitales'
] WHERE key = 'diseno-humano';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','bloqueos-emocionales','duelo-perdidas','miedos-creencias','transiciones-vitales'
] WHERE key = 'terapia-floral';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico'
] WHERE key = 'masaje-terapeutico';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico','bloqueos-emocionales','autoconocimiento'
] WHERE key = 'meditacion-mindfulness';

UPDATE practices SET specialties = ARRAY[
  'trauma-heridas','familia-linaje','bloqueos-emocionales','miedos-creencias'
] WHERE key = 'biodecodificacion';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico','bloqueos-emocionales','duelo-perdidas','trauma-heridas'
] WHERE key = 'sonoterapia';

UPDATE practices SET specialties = ARRAY[
  'autoconocimiento','vinculos-relaciones','miedos-creencias','transiciones-vitales'
] WHERE key = 'tarot-terapeutico';

UPDATE practices SET specialties = ARRAY[
  'autoconocimiento','proposito-vida','transiciones-vitales'
] WHERE key = 'astrologia';

UPDATE practices SET specialties = ARRAY[
  'autoconocimiento','proposito-vida','vinculos-relaciones','miedos-creencias','transiciones-vitales','pareja'
] WHERE key = 'coaching-ontologico';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico'
] WHERE key = 'aromaterapia';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico','bloqueos-emocionales','autoconocimiento'
] WHERE key = 'yoga-terapeutico';

UPDATE practices SET specialties = ARRAY[
  'estres-ansiedad','equilibrio-energetico','bloqueos-emocionales','duelo-perdidas','trauma-heridas'
] WHERE key = 'terapia-energetica';
