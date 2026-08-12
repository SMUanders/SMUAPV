-- =============================================================
-- SMU APV — Fase 2-tilføjelse: boolean-tjek for afventende fund-forslag
-- =============================================================
-- Lille hjælpefunktion, så ALLE authenticated kan se en diskret "afventer"-
-- markering på et fund UDEN adgang til forslagets payload, forfatter eller
-- øvrige detaljer. Returnerer KUN en boolean og tager fundets id.
--
-- SECURITY DEFINER + fast search_path = public → læser apv_forslag forbi
-- forslagets RLS, men lækker intet ud over ja/nej. apv_forslag' egen RLS og
-- alle øvrige objekter ændres IKKE.
--
-- Globalt unik timestamp (delt Supabase-projekt). Re-runbar: CREATE OR REPLACE
-- + idempotente REVOKE/GRANT. Rører ingen tidligere kørte migrationer.
-- =============================================================

CREATE OR REPLACE FUNCTION apv_fund_har_afventende_forslag(p_fund_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM apv_forslag
    WHERE entitet = 'fund' AND maal_id = p_fund_id AND status = 'afventer'
  );
$$;

-- Fjern PUBLIC-standard og giv kun authenticated ret til at kalde den.
REVOKE EXECUTE ON FUNCTION apv_fund_har_afventende_forslag(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION apv_fund_har_afventende_forslag(uuid) TO authenticated;
