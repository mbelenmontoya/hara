-- 014_dismiss_specialty_suggestion.sql
-- Removes a free-text specialty entry from every professional who has it.
-- Case-insensitive + trim so "PNL", "pnl", "Pnl" are all removed in one call.
-- Used by the admin "Descartar" action on the practices suggestions panel.

CREATE OR REPLACE FUNCTION dismiss_specialty_suggestion(p_entry text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  normalized text := lower(trim(p_entry));
BEGIN
  UPDATE professionals
  SET specialties = ARRAY(
    SELECT s FROM unnest(specialties) AS s
    WHERE lower(trim(s)) != normalized
  )
  WHERE EXISTS (
    SELECT 1 FROM unnest(specialties) AS s
    WHERE lower(trim(s)) = normalized
  );
END;
$$;

GRANT EXECUTE ON FUNCTION dismiss_specialty_suggestion(text) TO service_role;
