-- =============================================================
-- SMU APV — Opslags-fase: manglende felter fra Excel-APV'en
-- =============================================================
-- Additive, ikke-brydende kolonner. Excel-APV'en indeholder data, som den
-- nuværende model ikke har plads til, og som opslags-detaljesiderne skal vise:
--   * apv_kemikalier: forbrug (Excel G), lagermængde (H), arbejdsprocedure (P)
--   * apv_maskiner:   note (Excel Q)
--
-- Kun ADD COLUMN IF NOT EXISTS. Ingen eksisterende kolonner, policies eller
-- funktioner ændres. RLS gælder automatisk de nye kolonner (tabel-niveau).
-- Globalt unik timestamp (delt Supabase-projekt). Re-runbar.
--
-- BEMÆRK: forslags-whitelisten (apv_godkend_forslag) er IKKE udvidet med disse
-- felter — det gøres først når kemikalie-/maskine-redigering bygges som workflow.
-- I opslags-fasen skrives data kun via seed (direkte, forbi forslagssystemet).
-- =============================================================

ALTER TABLE apv_kemikalier ADD COLUMN IF NOT EXISTS forbrug          text;
ALTER TABLE apv_kemikalier ADD COLUMN IF NOT EXISTS lagermaengde     text;
ALTER TABLE apv_kemikalier ADD COLUMN IF NOT EXISTS arbejdsprocedure text;

ALTER TABLE apv_maskiner   ADD COLUMN IF NOT EXISTS note             text;

COMMENT ON COLUMN apv_kemikalier.forbrug IS 'Forbrug pr. uge (est.) — fritekst fra Excel.';
COMMENT ON COLUMN apv_kemikalier.lagermaengde IS 'Lagermængde — fritekst fra Excel.';
COMMENT ON COLUMN apv_kemikalier.arbejdsprocedure IS 'Arbejdsprocedure/instruks-reference — fritekst fra Excel.';
COMMENT ON COLUMN apv_maskiner.note IS 'Note — fritekst fra Excel.';
