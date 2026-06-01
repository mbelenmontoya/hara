-- 012_practices_specialty_mapping.sql
-- Add specialties[] to practices so each practice declares which symptom
-- domains (SPECIALTY_MAP keys) it addresses. Idempotent — safe to re-run.

ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS specialties text[] NOT NULL DEFAULT '{}';

-- Seed research-based mappings for all 15 existing practices.
-- Only updates rows where the key exists; no-ops on re-run (same values).
UPDATE practices SET specialties = ARRAY['anxiety','stress','depression','grief','children']
  WHERE key = 'reiki';

UPDATE practices SET specialties = ARRAY['relationships','family','trauma','grief','couples','addiction','self-esteem']
  WHERE key = 'constelaciones-familiares';

UPDATE practices SET specialties = ARRAY['trauma','grief','relationships','self-esteem']
  WHERE key = 'registros-akashicos';

UPDATE practices SET specialties = ARRAY['self-esteem','relationships','couples']
  WHERE key = 'diseno-humano';

UPDATE practices SET specialties = ARRAY['anxiety','stress','depression','grief','self-esteem','children']
  WHERE key = 'terapia-floral';

UPDATE practices SET specialties = ARRAY['stress','anxiety']
  WHERE key = 'masaje-terapeutico';

UPDATE practices SET specialties = ARRAY['anxiety','stress','depression','addiction','trauma','children']
  WHERE key = 'meditacion-mindfulness';

UPDATE practices SET specialties = ARRAY['eating-disorders','addiction','trauma','stress']
  WHERE key = 'biodecodificacion';

UPDATE practices SET specialties = ARRAY['stress','anxiety','depression']
  WHERE key = 'sonoterapia';

UPDATE practices SET specialties = ARRAY['self-esteem','grief','relationships']
  WHERE key = 'tarot-terapeutico';

UPDATE practices SET specialties = ARRAY['self-esteem','relationships']
  WHERE key = 'astrologia';

UPDATE practices SET specialties = ARRAY['self-esteem','stress','relationships']
  WHERE key = 'coaching-ontologico';

UPDATE practices SET specialties = ARRAY['stress','anxiety']
  WHERE key = 'aromaterapia';

UPDATE practices SET specialties = ARRAY['anxiety','depression','stress','trauma','self-esteem']
  WHERE key = 'yoga-terapeutico';

UPDATE practices SET specialties = ARRAY['stress','anxiety','trauma','grief']
  WHERE key = 'terapia-energetica';
