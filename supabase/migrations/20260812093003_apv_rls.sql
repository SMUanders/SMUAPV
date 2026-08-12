-- =============================================================
-- SMU APV — Fase 1: RLS + GRANTs (STRAM, fail-closed model)
-- =============================================================
-- Princip (spejler den hærdede SMU Wiki-model):
--   * authenticated kan LÆSE gældende (ikke-slettede) APV-data.
--   * authenticated kan oprette EGNE forslag (og kun se egne).
--   * KUN admin (apv_er_admin()) kan skrive direkte til domænetabellerne.
--   * Ingen almindelig bruger kan omgå forslagssystemet eller behandle forslag.
--   * INGEN hard delete: der gives ikke DELETE-privilegium. Sletning = soft
--     delete (slettet=true) via admin eller via godkendt 'slet'-forslag.
--
-- GRANTs giver kun rollen ret til at røre tabellen; RLS er den egentlige
-- adgangskontrol. Skrivning fra ikke-admins fejler på RLS (WITH CHECK false).
--
-- Re-runbar: hver policy droppes med IF EXISTS før genoprettelse; GRANT/ALTER
-- er idempotente.
-- =============================================================


-- ═════════════════════════════════════════════════════════════
-- Domænetabeller — læs gældende for alle; skriv kun admin.
-- Samme politik-sæt for alle otte autoritative tabeller.
-- ═════════════════════════════════════════════════════════════

-- ─── apv_omraader ───
ALTER TABLE apv_omraader ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON apv_omraader TO authenticated;
DROP POLICY IF EXISTS "apv_omraader_select" ON apv_omraader;
DROP POLICY IF EXISTS "apv_omraader_admin_insert" ON apv_omraader;
DROP POLICY IF EXISTS "apv_omraader_admin_update" ON apv_omraader;
CREATE POLICY "apv_omraader_select" ON apv_omraader
  FOR SELECT TO authenticated USING (NOT slettet OR apv_er_admin());
CREATE POLICY "apv_omraader_admin_insert" ON apv_omraader
  FOR INSERT TO authenticated WITH CHECK (apv_er_admin());
CREATE POLICY "apv_omraader_admin_update" ON apv_omraader
  FOR UPDATE TO authenticated USING (apv_er_admin()) WITH CHECK (apv_er_admin());

-- ─── apv_kemikalier ───
ALTER TABLE apv_kemikalier ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON apv_kemikalier TO authenticated;
DROP POLICY IF EXISTS "apv_kemikalier_select" ON apv_kemikalier;
DROP POLICY IF EXISTS "apv_kemikalier_admin_insert" ON apv_kemikalier;
DROP POLICY IF EXISTS "apv_kemikalier_admin_update" ON apv_kemikalier;
CREATE POLICY "apv_kemikalier_select" ON apv_kemikalier
  FOR SELECT TO authenticated USING (NOT slettet OR apv_er_admin());
CREATE POLICY "apv_kemikalier_admin_insert" ON apv_kemikalier
  FOR INSERT TO authenticated WITH CHECK (apv_er_admin());
CREATE POLICY "apv_kemikalier_admin_update" ON apv_kemikalier
  FOR UPDATE TO authenticated USING (apv_er_admin()) WITH CHECK (apv_er_admin());

-- ─── apv_maskiner ───
ALTER TABLE apv_maskiner ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON apv_maskiner TO authenticated;
DROP POLICY IF EXISTS "apv_maskiner_select" ON apv_maskiner;
DROP POLICY IF EXISTS "apv_maskiner_admin_insert" ON apv_maskiner;
DROP POLICY IF EXISTS "apv_maskiner_admin_update" ON apv_maskiner;
CREATE POLICY "apv_maskiner_select" ON apv_maskiner
  FOR SELECT TO authenticated USING (NOT slettet OR apv_er_admin());
CREATE POLICY "apv_maskiner_admin_insert" ON apv_maskiner
  FOR INSERT TO authenticated WITH CHECK (apv_er_admin());
CREATE POLICY "apv_maskiner_admin_update" ON apv_maskiner
  FOR UPDATE TO authenticated USING (apv_er_admin()) WITH CHECK (apv_er_admin());

-- ─── apv_paabud ───
ALTER TABLE apv_paabud ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON apv_paabud TO authenticated;
DROP POLICY IF EXISTS "apv_paabud_select" ON apv_paabud;
DROP POLICY IF EXISTS "apv_paabud_admin_insert" ON apv_paabud;
DROP POLICY IF EXISTS "apv_paabud_admin_update" ON apv_paabud;
CREATE POLICY "apv_paabud_select" ON apv_paabud
  FOR SELECT TO authenticated USING (NOT slettet OR apv_er_admin());
CREATE POLICY "apv_paabud_admin_insert" ON apv_paabud
  FOR INSERT TO authenticated WITH CHECK (apv_er_admin());
CREATE POLICY "apv_paabud_admin_update" ON apv_paabud
  FOR UPDATE TO authenticated USING (apv_er_admin()) WITH CHECK (apv_er_admin());

-- ─── apv_fund ───
ALTER TABLE apv_fund ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON apv_fund TO authenticated;
DROP POLICY IF EXISTS "apv_fund_select" ON apv_fund;
DROP POLICY IF EXISTS "apv_fund_admin_insert" ON apv_fund;
DROP POLICY IF EXISTS "apv_fund_admin_update" ON apv_fund;
CREATE POLICY "apv_fund_select" ON apv_fund
  FOR SELECT TO authenticated USING (NOT slettet OR apv_er_admin());
CREATE POLICY "apv_fund_admin_insert" ON apv_fund
  FOR INSERT TO authenticated WITH CHECK (apv_er_admin());
CREATE POLICY "apv_fund_admin_update" ON apv_fund
  FOR UPDATE TO authenticated USING (apv_er_admin()) WITH CHECK (apv_er_admin());

-- ─── apv_eftersyn ───
ALTER TABLE apv_eftersyn ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON apv_eftersyn TO authenticated;
DROP POLICY IF EXISTS "apv_eftersyn_select" ON apv_eftersyn;
DROP POLICY IF EXISTS "apv_eftersyn_admin_insert" ON apv_eftersyn;
DROP POLICY IF EXISTS "apv_eftersyn_admin_update" ON apv_eftersyn;
CREATE POLICY "apv_eftersyn_select" ON apv_eftersyn
  FOR SELECT TO authenticated USING (NOT slettet OR apv_er_admin());
CREATE POLICY "apv_eftersyn_admin_insert" ON apv_eftersyn
  FOR INSERT TO authenticated WITH CHECK (apv_er_admin());
CREATE POLICY "apv_eftersyn_admin_update" ON apv_eftersyn
  FOR UPDATE TO authenticated USING (apv_er_admin()) WITH CHECK (apv_er_admin());

-- ─── apv_krv ───
ALTER TABLE apv_krv ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON apv_krv TO authenticated;
DROP POLICY IF EXISTS "apv_krv_select" ON apv_krv;
DROP POLICY IF EXISTS "apv_krv_admin_insert" ON apv_krv;
DROP POLICY IF EXISTS "apv_krv_admin_update" ON apv_krv;
CREATE POLICY "apv_krv_select" ON apv_krv
  FOR SELECT TO authenticated USING (NOT slettet OR apv_er_admin());
CREATE POLICY "apv_krv_admin_insert" ON apv_krv
  FOR INSERT TO authenticated WITH CHECK (apv_er_admin());
CREATE POLICY "apv_krv_admin_update" ON apv_krv
  FOR UPDATE TO authenticated USING (apv_er_admin()) WITH CHECK (apv_er_admin());

-- ─── apv_handlinger ───
ALTER TABLE apv_handlinger ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON apv_handlinger TO authenticated;
DROP POLICY IF EXISTS "apv_handlinger_select" ON apv_handlinger;
DROP POLICY IF EXISTS "apv_handlinger_admin_insert" ON apv_handlinger;
DROP POLICY IF EXISTS "apv_handlinger_admin_update" ON apv_handlinger;
CREATE POLICY "apv_handlinger_select" ON apv_handlinger
  FOR SELECT TO authenticated USING (NOT slettet OR apv_er_admin());
CREATE POLICY "apv_handlinger_admin_insert" ON apv_handlinger
  FOR INSERT TO authenticated WITH CHECK (apv_er_admin());
CREATE POLICY "apv_handlinger_admin_update" ON apv_handlinger
  FOR UPDATE TO authenticated USING (apv_er_admin()) WITH CHECK (apv_er_admin());


-- ═════════════════════════════════════════════════════════════
-- Beregnede views — læseadgang (RLS håndhæves på basetabellerne
-- via security_invoker).
-- ═════════════════════════════════════════════════════════════
GRANT SELECT ON apv_fund_beriget     TO authenticated;
GRANT SELECT ON apv_maskiner_beriget TO authenticated;


-- ═════════════════════════════════════════════════════════════
-- apv_forslag — egne forslag; kun oprettelse (aldrig direkte UPDATE/DELETE).
-- Behandling (godkend/afvis) sker UDELUKKENDE via SECURITY DEFINER-funktioner,
-- så status ikke kan manipuleres til 'godkendt' af nogen klient.
-- ═════════════════════════════════════════════════════════════
ALTER TABLE apv_forslag ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON apv_forslag TO authenticated;   -- bevidst INGEN UPDATE/DELETE

DROP POLICY IF EXISTS "apv_forslag_select_egne_eller_admin" ON apv_forslag;
DROP POLICY IF EXISTS "apv_forslag_insert_egne" ON apv_forslag;

-- Se kun egne forslag (admin ser alle).
CREATE POLICY "apv_forslag_select_egne_eller_admin" ON apv_forslag
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR apv_er_admin());

-- Opret kun EGNE forslag, kun som 'afventer', uden behandlingsfelter sat.
CREATE POLICY "apv_forslag_insert_egne" ON apv_forslag
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND status = 'afventer'
    AND behandlet_at IS NULL
    AND behandlet_by IS NULL
    AND afvisning_note IS NULL
  );

-- Ingen UPDATE/DELETE-politik: forslag bevares som historik og behandles kun
-- via apv_godkend_forslag() / apv_afvis_forslag().
