-- =============================================================
-- SMU APV — Fase 1: Godkendelses-/afvisningsfunktioner (forslag → sandhed)
-- =============================================================
-- apv_godkend_forslag() anvender et forslag på den TYPEDE domænetabel.
--
-- Sikkerhedsdesign:
--   * SECURITY DEFINER + fast search_path = public.
--   * FØRSTE handling er adgangskontrol: apv_er_admin() ellers exception.
--   * INGEN dynamic SQL. entitet + operation vælger via CASE en fast,
--     håndskrevet sætning mod én bestemt tabel.
--   * WHITELIST pr. entitet: jsonb_to_record(...) med eksplicit kolonneliste.
--     Kun de opførte felter kan sættes. Ukendte payload-nøgler ignoreres.
--     Genererede felter (score/score_efter/score_foer) og audit/slettet kan
--     IKKE sættes fra payload. created_by = forslagsstiller, updated_by = admin.
--   * Ét stort selvstændigt funktionslegeme (ingen ikke-gatede hjælpefunktioner
--     der kunne kaldes direkte og omgå admin-tjekket).
--   * FK-constraints validerer referencer (omraade_id, kemikalie_id, …);
--     type-cast i jsonb_to_record validerer felttyper; CHECK validerer enums.
--
-- 'ret' skelner på JSONB-key-presence (f.payload ? 'felt'):
--   * nøgle mangler          → behold eksisterende værdi
--   * nøgle med værdi         → brug den nye værdi
--   * nøgle eksplicit = null  → sæt NULL, HVIS kolonnen er nullable
-- Nullable felter bruger derfor CASE WHEN f.payload ? 'felt' THEN x.felt ELSE
-- eksisterende END. Non-nullable felter bruger fortsat COALESCE(x.felt,
-- eksisterende), så de aldrig kan nulstilles (en eksplicit null ignoreres og
-- den gamle værdi bevares).
-- =============================================================

CREATE OR REPLACE FUNCTION apv_godkend_forslag(p_forslag_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  f       apv_forslag%ROWTYPE;
  v_admin uuid := auth.uid();
  v_res   uuid;
BEGIN
  -- 1) Adgangskontrol FØRST.
  IF NOT apv_er_admin() THEN
    RAISE EXCEPTION 'Kun admin kan godkende forslag';
  END IF;

  -- 2) Hent + lås forslaget.
  SELECT * INTO f FROM apv_forslag WHERE id = p_forslag_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Forslag findes ikke';
  END IF;
  IF f.status <> 'afventer' THEN
    RAISE EXCEPTION 'Forslag er allerede behandlet';
  END IF;

  -- 3) Anvend forslaget via whitelist.
  -- ─────────────── SLET (soft delete) ───────────────
  IF f.operation = 'slet' THEN
    CASE f.entitet
      WHEN 'omraade'   THEN UPDATE apv_omraader   SET slettet=true, updated_by=v_admin WHERE id=f.maal_id AND NOT slettet;
      WHEN 'fund'      THEN UPDATE apv_fund        SET slettet=true, updated_by=v_admin WHERE id=f.maal_id AND NOT slettet;
      WHEN 'handling'  THEN UPDATE apv_handlinger  SET slettet=true, updated_by=v_admin WHERE id=f.maal_id AND NOT slettet;
      WHEN 'kemikalie' THEN UPDATE apv_kemikalier  SET slettet=true, updated_by=v_admin WHERE id=f.maal_id AND NOT slettet;
      WHEN 'krv'       THEN UPDATE apv_krv         SET slettet=true, updated_by=v_admin WHERE id=f.maal_id AND NOT slettet;
      WHEN 'maskine'   THEN UPDATE apv_maskiner    SET slettet=true, updated_by=v_admin WHERE id=f.maal_id AND NOT slettet;
      WHEN 'eftersyn'  THEN UPDATE apv_eftersyn    SET slettet=true, updated_by=v_admin WHERE id=f.maal_id AND NOT slettet;
      WHEN 'paabud'    THEN UPDATE apv_paabud      SET slettet=true, updated_by=v_admin WHERE id=f.maal_id AND NOT slettet;
      ELSE RAISE EXCEPTION 'Ukendt entitet: %', f.entitet;
    END CASE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Målrække findes ikke eller er allerede slettet';
    END IF;
    v_res := f.maal_id;

  -- ─────────────── OPRET ───────────────
  ELSIF f.operation = 'opret' THEN
    CASE f.entitet

      WHEN 'omraade' THEN
        IF f.payload->>'navn' IS NULL OR btrim(f.payload->>'navn') = '' THEN
          RAISE EXCEPTION 'Område kræver et navn';
        END IF;
        INSERT INTO apv_omraader (navn, beskrivelse, sort_order, created_by, updated_by)
        SELECT x.navn, x.beskrivelse, COALESCE(x.sort_order, 0), f.created_by, v_admin
        FROM jsonb_to_record(f.payload) AS x(navn text, beskrivelse text, sort_order int)
        RETURNING id INTO v_res;

      WHEN 'fund' THEN
        IF f.payload->>'titel' IS NULL OR btrim(f.payload->>'titel') = '' THEN
          RAISE EXCEPTION 'Fund kræver en titel';
        END IF;
        INSERT INTO apv_fund (
          omraade_id, titel, beskrivelse, kilde_aarsag, saerlige_grupper,
          alvor, sandsynlighed, alvor_efter, sandsynlighed_efter,
          nuvaerende_foranstaltninger, ansvarlig_id, status, deadline, dokumenter,
          created_by, updated_by)
        SELECT
          x.omraade_id, x.titel, x.beskrivelse, x.kilde_aarsag, x.saerlige_grupper,
          x.alvor, x.sandsynlighed, x.alvor_efter, x.sandsynlighed_efter,
          x.nuvaerende_foranstaltninger, x.ansvarlig_id,
          COALESCE(x.status, 'ny'), x.deadline, COALESCE(x.dokumenter, '[]'::jsonb),
          f.created_by, v_admin
        FROM jsonb_to_record(f.payload) AS x(
          omraade_id uuid, titel text, beskrivelse text, kilde_aarsag text, saerlige_grupper text,
          alvor smallint, sandsynlighed smallint, alvor_efter smallint, sandsynlighed_efter smallint,
          nuvaerende_foranstaltninger text, ansvarlig_id uuid, status text, deadline date, dokumenter jsonb)
        RETURNING id INTO v_res;

      WHEN 'handling' THEN
        IF f.payload->>'titel' IS NULL OR btrim(f.payload->>'titel') = '' THEN
          RAISE EXCEPTION 'Handling kræver en titel';
        END IF;
        INSERT INTO apv_handlinger (
          fund_id, paabud_id, titel, beskrivelse, prioritet, ansvarlig_id,
          startdato, deadline, opfoelgning_dato, ressourcer_udgift, status, dokumenter,
          created_by, updated_by)
        SELECT
          x.fund_id, x.paabud_id, x.titel, x.beskrivelse, COALESCE(x.prioritet, 'middel'),
          x.ansvarlig_id, x.startdato, x.deadline, x.opfoelgning_dato, x.ressourcer_udgift,
          COALESCE(x.status, 'planlagt'), COALESCE(x.dokumenter, '[]'::jsonb), f.created_by, v_admin
        FROM jsonb_to_record(f.payload) AS x(
          fund_id uuid, paabud_id uuid, titel text, beskrivelse text, prioritet text,
          ansvarlig_id uuid, startdato date, deadline date, opfoelgning_dato date,
          ressourcer_udgift text, status text, dokumenter jsonb)
        RETURNING id INTO v_res;

      WHEN 'kemikalie' THEN
        IF f.payload->>'produktnavn' IS NULL OR btrim(f.payload->>'produktnavn') = '' THEN
          RAISE EXCEPTION 'Kemikalie kræver et produktnavn';
        END IF;
        INSERT INTO apv_kemikalier (
          produktnavn, leverandoer, sds_dato, h_saetninger, piktogrammer, anvendelse,
          opbevaringssted, ppe, eksponeringsveje, ventilation, substitution_mulig, affald,
          dokumenter, created_by, updated_by)
        SELECT
          x.produktnavn, x.leverandoer, x.sds_dato,
          COALESCE(x.h_saetninger, '[]'::jsonb), COALESCE(x.piktogrammer, '[]'::jsonb),
          x.anvendelse, x.opbevaringssted, x.ppe, x.eksponeringsveje, x.ventilation,
          x.substitution_mulig, x.affald, COALESCE(x.dokumenter, '[]'::jsonb), f.created_by, v_admin
        FROM jsonb_to_record(f.payload) AS x(
          produktnavn text, leverandoer text, sds_dato date, h_saetninger jsonb, piktogrammer jsonb,
          anvendelse text, opbevaringssted text, ppe text, eksponeringsveje text, ventilation text,
          substitution_mulig boolean, affald text, dokumenter jsonb)
        RETURNING id INTO v_res;

      WHEN 'krv' THEN
        IF f.payload->>'kemikalie_id' IS NULL THEN
          RAISE EXCEPTION 'KRV kræver kemikalie_id';
        END IF;
        IF f.payload->>'opgave_proces' IS NULL OR btrim(f.payload->>'opgave_proces') = '' THEN
          RAISE EXCEPTION 'KRV kræver opgave/proces';
        END IF;
        INSERT INTO apv_krv (
          kemikalie_id, opgave_proces, maengde, varighed, hyppighed, arbejdsform, ventilation,
          eksponeret_antal, graensevaerdi_relevant, alvor_foer, sandsynlighed_foer,
          foranstaltninger, instruktion_dato, kontrol_tilsyn, alvor_efter, sandsynlighed_efter,
          acceptabel, dokumenter, created_by, updated_by)
        SELECT
          x.kemikalie_id, x.opgave_proces, x.maengde, x.varighed, x.hyppighed, x.arbejdsform,
          x.ventilation, x.eksponeret_antal, x.graensevaerdi_relevant, x.alvor_foer, x.sandsynlighed_foer,
          x.foranstaltninger, x.instruktion_dato, x.kontrol_tilsyn, x.alvor_efter, x.sandsynlighed_efter,
          x.acceptabel, COALESCE(x.dokumenter, '[]'::jsonb), f.created_by, v_admin
        FROM jsonb_to_record(f.payload) AS x(
          kemikalie_id uuid, opgave_proces text, maengde text, varighed text, hyppighed text,
          arbejdsform text, ventilation text, eksponeret_antal int, graensevaerdi_relevant boolean,
          alvor_foer smallint, sandsynlighed_foer smallint, foranstaltninger text, instruktion_dato date,
          kontrol_tilsyn text, alvor_efter smallint, sandsynlighed_efter smallint, acceptabel boolean, dokumenter jsonb)
        RETURNING id INTO v_res;

      WHEN 'maskine' THEN
        IF f.payload->>'navn' IS NULL OR btrim(f.payload->>'navn') = '' THEN
          RAISE EXCEPTION 'Maskine kræver et navn';
        END IF;
        INSERT INTO apv_maskiner (
          type, navn, serienr, fabrikat_model, aargang, omraade_id, ansvarlig_id,
          eftersyn_interval_mdr, daglig_tjek, status, dokumenter, created_by, updated_by)
        SELECT
          x.type, x.navn, x.serienr, x.fabrikat_model, x.aargang, x.omraade_id, x.ansvarlig_id,
          x.eftersyn_interval_mdr, COALESCE(x.daglig_tjek, false), COALESCE(x.status, 'ok'),
          COALESCE(x.dokumenter, '[]'::jsonb), f.created_by, v_admin
        FROM jsonb_to_record(f.payload) AS x(
          type text, navn text, serienr text, fabrikat_model text, aargang int, omraade_id uuid,
          ansvarlig_id uuid, eftersyn_interval_mdr int, daglig_tjek boolean, status text, dokumenter jsonb)
        RETURNING id INTO v_res;

      WHEN 'eftersyn' THEN
        IF f.payload->>'maskine_id' IS NULL THEN
          RAISE EXCEPTION 'Eftersyn kræver maskine_id';
        END IF;
        IF f.payload->>'dato' IS NULL THEN
          RAISE EXCEPTION 'Eftersyn kræver dato';
        END IF;
        IF f.payload->>'resultat' IS NULL THEN
          RAISE EXCEPTION 'Eftersyn kræver resultat';
        END IF;
        INSERT INTO apv_eftersyn (
          maskine_id, dato, udfoert_af_id, resultat, note, dokumenter, created_by, updated_by)
        SELECT
          x.maskine_id, x.dato, x.udfoert_af_id, x.resultat, x.note,
          COALESCE(x.dokumenter, '[]'::jsonb), f.created_by, v_admin
        FROM jsonb_to_record(f.payload) AS x(
          maskine_id uuid, dato date, udfoert_af_id uuid, resultat text, note text, dokumenter jsonb)
        RETURNING id INTO v_res;

      WHEN 'paabud' THEN
        IF f.payload->>'titel' IS NULL OR btrim(f.payload->>'titel') = '' THEN
          RAISE EXCEPTION 'Påbud kræver en titel';
        END IF;
        INSERT INTO apv_paabud (
          type, myndighed, titel, krav, dato_modtaget, ansvarlig_id, frist, status,
          dato_tilbagemelding, dokumenter, created_by, updated_by)
        SELECT
          COALESCE(x.type, 'paabud'), COALESCE(x.myndighed, 'Arbejdstilsynet'), x.titel, x.krav,
          x.dato_modtaget, x.ansvarlig_id, x.frist, COALESCE(x.status, 'modtaget'), x.dato_tilbagemelding,
          COALESCE(x.dokumenter, '[]'::jsonb), f.created_by, v_admin
        FROM jsonb_to_record(f.payload) AS x(
          type text, myndighed text, titel text, krav text, dato_modtaget date, ansvarlig_id uuid,
          frist date, status text, dato_tilbagemelding date, dokumenter jsonb)
        RETURNING id INTO v_res;

      ELSE RAISE EXCEPTION 'Ukendt entitet: %', f.entitet;
    END CASE;

  -- ─────────────── RET (opdatering) ───────────────
  ELSE  -- f.operation = 'ret'
    CASE f.entitet

      WHEN 'omraade' THEN
        UPDATE apv_omraader SET
          navn = COALESCE(x.navn, apv_omraader.navn),                    -- NOT NULL
          beskrivelse = CASE WHEN f.payload ? 'beskrivelse' THEN x.beskrivelse ELSE apv_omraader.beskrivelse END,
          sort_order = COALESCE(x.sort_order, apv_omraader.sort_order),  -- NOT NULL
          updated_by = v_admin
        FROM jsonb_to_record(f.payload) AS x(navn text, beskrivelse text, sort_order int)
        WHERE apv_omraader.id = f.maal_id AND NOT apv_omraader.slettet;

      WHEN 'fund' THEN
        UPDATE apv_fund SET
          omraade_id = CASE WHEN f.payload ? 'omraade_id' THEN x.omraade_id ELSE apv_fund.omraade_id END,
          titel = COALESCE(x.titel, apv_fund.titel),                     -- NOT NULL
          beskrivelse = CASE WHEN f.payload ? 'beskrivelse' THEN x.beskrivelse ELSE apv_fund.beskrivelse END,
          kilde_aarsag = CASE WHEN f.payload ? 'kilde_aarsag' THEN x.kilde_aarsag ELSE apv_fund.kilde_aarsag END,
          saerlige_grupper = CASE WHEN f.payload ? 'saerlige_grupper' THEN x.saerlige_grupper ELSE apv_fund.saerlige_grupper END,
          alvor = CASE WHEN f.payload ? 'alvor' THEN x.alvor ELSE apv_fund.alvor END,
          sandsynlighed = CASE WHEN f.payload ? 'sandsynlighed' THEN x.sandsynlighed ELSE apv_fund.sandsynlighed END,
          alvor_efter = CASE WHEN f.payload ? 'alvor_efter' THEN x.alvor_efter ELSE apv_fund.alvor_efter END,
          sandsynlighed_efter = CASE WHEN f.payload ? 'sandsynlighed_efter' THEN x.sandsynlighed_efter ELSE apv_fund.sandsynlighed_efter END,
          nuvaerende_foranstaltninger = CASE WHEN f.payload ? 'nuvaerende_foranstaltninger' THEN x.nuvaerende_foranstaltninger ELSE apv_fund.nuvaerende_foranstaltninger END,
          ansvarlig_id = CASE WHEN f.payload ? 'ansvarlig_id' THEN x.ansvarlig_id ELSE apv_fund.ansvarlig_id END,
          status = COALESCE(x.status, apv_fund.status),                  -- NOT NULL
          deadline = CASE WHEN f.payload ? 'deadline' THEN x.deadline ELSE apv_fund.deadline END,
          dokumenter = COALESCE(x.dokumenter, apv_fund.dokumenter),      -- NOT NULL
          updated_by = v_admin
        FROM jsonb_to_record(f.payload) AS x(
          omraade_id uuid, titel text, beskrivelse text, kilde_aarsag text, saerlige_grupper text,
          alvor smallint, sandsynlighed smallint, alvor_efter smallint, sandsynlighed_efter smallint,
          nuvaerende_foranstaltninger text, ansvarlig_id uuid, status text, deadline date, dokumenter jsonb)
        WHERE apv_fund.id = f.maal_id AND NOT apv_fund.slettet;

      WHEN 'handling' THEN
        UPDATE apv_handlinger SET
          fund_id = CASE WHEN f.payload ? 'fund_id' THEN x.fund_id ELSE apv_handlinger.fund_id END,
          paabud_id = CASE WHEN f.payload ? 'paabud_id' THEN x.paabud_id ELSE apv_handlinger.paabud_id END,
          titel = COALESCE(x.titel, apv_handlinger.titel),               -- NOT NULL
          beskrivelse = CASE WHEN f.payload ? 'beskrivelse' THEN x.beskrivelse ELSE apv_handlinger.beskrivelse END,
          prioritet = COALESCE(x.prioritet, apv_handlinger.prioritet),   -- NOT NULL
          ansvarlig_id = CASE WHEN f.payload ? 'ansvarlig_id' THEN x.ansvarlig_id ELSE apv_handlinger.ansvarlig_id END,
          startdato = CASE WHEN f.payload ? 'startdato' THEN x.startdato ELSE apv_handlinger.startdato END,
          deadline = CASE WHEN f.payload ? 'deadline' THEN x.deadline ELSE apv_handlinger.deadline END,
          opfoelgning_dato = CASE WHEN f.payload ? 'opfoelgning_dato' THEN x.opfoelgning_dato ELSE apv_handlinger.opfoelgning_dato END,
          ressourcer_udgift = CASE WHEN f.payload ? 'ressourcer_udgift' THEN x.ressourcer_udgift ELSE apv_handlinger.ressourcer_udgift END,
          status = COALESCE(x.status, apv_handlinger.status),            -- NOT NULL
          dokumenter = COALESCE(x.dokumenter, apv_handlinger.dokumenter),-- NOT NULL
          updated_by = v_admin
        FROM jsonb_to_record(f.payload) AS x(
          fund_id uuid, paabud_id uuid, titel text, beskrivelse text, prioritet text,
          ansvarlig_id uuid, startdato date, deadline date, opfoelgning_dato date,
          ressourcer_udgift text, status text, dokumenter jsonb)
        WHERE apv_handlinger.id = f.maal_id AND NOT apv_handlinger.slettet;

      WHEN 'kemikalie' THEN
        UPDATE apv_kemikalier SET
          produktnavn = COALESCE(x.produktnavn, apv_kemikalier.produktnavn),  -- NOT NULL
          leverandoer = CASE WHEN f.payload ? 'leverandoer' THEN x.leverandoer ELSE apv_kemikalier.leverandoer END,
          sds_dato = CASE WHEN f.payload ? 'sds_dato' THEN x.sds_dato ELSE apv_kemikalier.sds_dato END,
          h_saetninger = COALESCE(x.h_saetninger, apv_kemikalier.h_saetninger),  -- NOT NULL
          piktogrammer = COALESCE(x.piktogrammer, apv_kemikalier.piktogrammer),  -- NOT NULL
          anvendelse = CASE WHEN f.payload ? 'anvendelse' THEN x.anvendelse ELSE apv_kemikalier.anvendelse END,
          opbevaringssted = CASE WHEN f.payload ? 'opbevaringssted' THEN x.opbevaringssted ELSE apv_kemikalier.opbevaringssted END,
          ppe = CASE WHEN f.payload ? 'ppe' THEN x.ppe ELSE apv_kemikalier.ppe END,
          eksponeringsveje = CASE WHEN f.payload ? 'eksponeringsveje' THEN x.eksponeringsveje ELSE apv_kemikalier.eksponeringsveje END,
          ventilation = CASE WHEN f.payload ? 'ventilation' THEN x.ventilation ELSE apv_kemikalier.ventilation END,
          substitution_mulig = CASE WHEN f.payload ? 'substitution_mulig' THEN x.substitution_mulig ELSE apv_kemikalier.substitution_mulig END,
          affald = CASE WHEN f.payload ? 'affald' THEN x.affald ELSE apv_kemikalier.affald END,
          dokumenter = COALESCE(x.dokumenter, apv_kemikalier.dokumenter),  -- NOT NULL
          updated_by = v_admin
        FROM jsonb_to_record(f.payload) AS x(
          produktnavn text, leverandoer text, sds_dato date, h_saetninger jsonb, piktogrammer jsonb,
          anvendelse text, opbevaringssted text, ppe text, eksponeringsveje text, ventilation text,
          substitution_mulig boolean, affald text, dokumenter jsonb)
        WHERE apv_kemikalier.id = f.maal_id AND NOT apv_kemikalier.slettet;

      WHEN 'krv' THEN
        UPDATE apv_krv SET
          kemikalie_id = COALESCE(x.kemikalie_id, apv_krv.kemikalie_id),    -- NOT NULL
          opgave_proces = COALESCE(x.opgave_proces, apv_krv.opgave_proces), -- NOT NULL
          maengde = CASE WHEN f.payload ? 'maengde' THEN x.maengde ELSE apv_krv.maengde END,
          varighed = CASE WHEN f.payload ? 'varighed' THEN x.varighed ELSE apv_krv.varighed END,
          hyppighed = CASE WHEN f.payload ? 'hyppighed' THEN x.hyppighed ELSE apv_krv.hyppighed END,
          arbejdsform = CASE WHEN f.payload ? 'arbejdsform' THEN x.arbejdsform ELSE apv_krv.arbejdsform END,
          ventilation = CASE WHEN f.payload ? 'ventilation' THEN x.ventilation ELSE apv_krv.ventilation END,
          eksponeret_antal = CASE WHEN f.payload ? 'eksponeret_antal' THEN x.eksponeret_antal ELSE apv_krv.eksponeret_antal END,
          graensevaerdi_relevant = CASE WHEN f.payload ? 'graensevaerdi_relevant' THEN x.graensevaerdi_relevant ELSE apv_krv.graensevaerdi_relevant END,
          alvor_foer = CASE WHEN f.payload ? 'alvor_foer' THEN x.alvor_foer ELSE apv_krv.alvor_foer END,
          sandsynlighed_foer = CASE WHEN f.payload ? 'sandsynlighed_foer' THEN x.sandsynlighed_foer ELSE apv_krv.sandsynlighed_foer END,
          foranstaltninger = CASE WHEN f.payload ? 'foranstaltninger' THEN x.foranstaltninger ELSE apv_krv.foranstaltninger END,
          instruktion_dato = CASE WHEN f.payload ? 'instruktion_dato' THEN x.instruktion_dato ELSE apv_krv.instruktion_dato END,
          kontrol_tilsyn = CASE WHEN f.payload ? 'kontrol_tilsyn' THEN x.kontrol_tilsyn ELSE apv_krv.kontrol_tilsyn END,
          alvor_efter = CASE WHEN f.payload ? 'alvor_efter' THEN x.alvor_efter ELSE apv_krv.alvor_efter END,
          sandsynlighed_efter = CASE WHEN f.payload ? 'sandsynlighed_efter' THEN x.sandsynlighed_efter ELSE apv_krv.sandsynlighed_efter END,
          acceptabel = CASE WHEN f.payload ? 'acceptabel' THEN x.acceptabel ELSE apv_krv.acceptabel END,
          dokumenter = COALESCE(x.dokumenter, apv_krv.dokumenter),          -- NOT NULL
          updated_by = v_admin
        FROM jsonb_to_record(f.payload) AS x(
          kemikalie_id uuid, opgave_proces text, maengde text, varighed text, hyppighed text,
          arbejdsform text, ventilation text, eksponeret_antal int, graensevaerdi_relevant boolean,
          alvor_foer smallint, sandsynlighed_foer smallint, foranstaltninger text, instruktion_dato date,
          kontrol_tilsyn text, alvor_efter smallint, sandsynlighed_efter smallint, acceptabel boolean, dokumenter jsonb)
        WHERE apv_krv.id = f.maal_id AND NOT apv_krv.slettet;

      WHEN 'maskine' THEN
        UPDATE apv_maskiner SET
          type = CASE WHEN f.payload ? 'type' THEN x.type ELSE apv_maskiner.type END,
          navn = COALESCE(x.navn, apv_maskiner.navn),                    -- NOT NULL
          serienr = CASE WHEN f.payload ? 'serienr' THEN x.serienr ELSE apv_maskiner.serienr END,
          fabrikat_model = CASE WHEN f.payload ? 'fabrikat_model' THEN x.fabrikat_model ELSE apv_maskiner.fabrikat_model END,
          aargang = CASE WHEN f.payload ? 'aargang' THEN x.aargang ELSE apv_maskiner.aargang END,
          omraade_id = CASE WHEN f.payload ? 'omraade_id' THEN x.omraade_id ELSE apv_maskiner.omraade_id END,
          ansvarlig_id = CASE WHEN f.payload ? 'ansvarlig_id' THEN x.ansvarlig_id ELSE apv_maskiner.ansvarlig_id END,
          eftersyn_interval_mdr = CASE WHEN f.payload ? 'eftersyn_interval_mdr' THEN x.eftersyn_interval_mdr ELSE apv_maskiner.eftersyn_interval_mdr END,
          daglig_tjek = COALESCE(x.daglig_tjek, apv_maskiner.daglig_tjek),  -- NOT NULL
          status = COALESCE(x.status, apv_maskiner.status),              -- NOT NULL
          dokumenter = COALESCE(x.dokumenter, apv_maskiner.dokumenter),  -- NOT NULL
          updated_by = v_admin
        FROM jsonb_to_record(f.payload) AS x(
          type text, navn text, serienr text, fabrikat_model text, aargang int, omraade_id uuid,
          ansvarlig_id uuid, eftersyn_interval_mdr int, daglig_tjek boolean, status text, dokumenter jsonb)
        WHERE apv_maskiner.id = f.maal_id AND NOT apv_maskiner.slettet;

      WHEN 'eftersyn' THEN
        UPDATE apv_eftersyn SET
          maskine_id = COALESCE(x.maskine_id, apv_eftersyn.maskine_id),  -- NOT NULL
          dato = COALESCE(x.dato, apv_eftersyn.dato),                    -- NOT NULL
          udfoert_af_id = CASE WHEN f.payload ? 'udfoert_af_id' THEN x.udfoert_af_id ELSE apv_eftersyn.udfoert_af_id END,
          resultat = COALESCE(x.resultat, apv_eftersyn.resultat),        -- NOT NULL
          note = CASE WHEN f.payload ? 'note' THEN x.note ELSE apv_eftersyn.note END,
          dokumenter = COALESCE(x.dokumenter, apv_eftersyn.dokumenter),  -- NOT NULL
          updated_by = v_admin
        FROM jsonb_to_record(f.payload) AS x(
          maskine_id uuid, dato date, udfoert_af_id uuid, resultat text, note text, dokumenter jsonb)
        WHERE apv_eftersyn.id = f.maal_id AND NOT apv_eftersyn.slettet;

      WHEN 'paabud' THEN
        UPDATE apv_paabud SET
          type = COALESCE(x.type, apv_paabud.type),                     -- NOT NULL
          myndighed = COALESCE(x.myndighed, apv_paabud.myndighed),      -- NOT NULL
          titel = COALESCE(x.titel, apv_paabud.titel),                  -- NOT NULL
          krav = CASE WHEN f.payload ? 'krav' THEN x.krav ELSE apv_paabud.krav END,
          dato_modtaget = CASE WHEN f.payload ? 'dato_modtaget' THEN x.dato_modtaget ELSE apv_paabud.dato_modtaget END,
          ansvarlig_id = CASE WHEN f.payload ? 'ansvarlig_id' THEN x.ansvarlig_id ELSE apv_paabud.ansvarlig_id END,
          frist = CASE WHEN f.payload ? 'frist' THEN x.frist ELSE apv_paabud.frist END,
          status = COALESCE(x.status, apv_paabud.status),               -- NOT NULL
          dato_tilbagemelding = CASE WHEN f.payload ? 'dato_tilbagemelding' THEN x.dato_tilbagemelding ELSE apv_paabud.dato_tilbagemelding END,
          dokumenter = COALESCE(x.dokumenter, apv_paabud.dokumenter),   -- NOT NULL
          updated_by = v_admin
        FROM jsonb_to_record(f.payload) AS x(
          type text, myndighed text, titel text, krav text, dato_modtaget date, ansvarlig_id uuid,
          frist date, status text, dato_tilbagemelding date, dokumenter jsonb)
        WHERE apv_paabud.id = f.maal_id AND NOT apv_paabud.slettet;

      ELSE RAISE EXCEPTION 'Ukendt entitet: %', f.entitet;
    END CASE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Målrække findes ikke eller er slettet';
    END IF;
    v_res := f.maal_id;
  END IF;

  -- 4) Markér forslaget godkendt.
  UPDATE apv_forslag
     SET status = 'godkendt', behandlet_at = now(), behandlet_by = v_admin
   WHERE id = p_forslag_id;

  RETURN v_res;
END;
$$;


-- Afvis et forslag (ingen domænedata ændres).
CREATE OR REPLACE FUNCTION apv_afvis_forslag(p_forslag_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT apv_er_admin() THEN
    RAISE EXCEPTION 'Kun admin kan afvise forslag';
  END IF;

  SELECT status INTO v_status FROM apv_forslag WHERE id = p_forslag_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Forslag findes ikke';
  END IF;
  IF v_status <> 'afventer' THEN
    RAISE EXCEPTION 'Forslag er allerede behandlet';
  END IF;

  UPDATE apv_forslag
     SET status = 'afvist', afvisning_note = p_note,
         behandlet_at = now(), behandlet_by = auth.uid()
   WHERE id = p_forslag_id;
END;
$$;


-- ─── Rettigheder ───
-- Behandlingsfunktionerne: fjern PUBLIC-standard og giv kun authenticated
-- (den interne apv_er_admin()-check er den egentlige gate).
REVOKE EXECUTE ON FUNCTION apv_godkend_forslag(uuid)      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION apv_afvis_forslag(uuid, text)  FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION apv_godkend_forslag(uuid)      TO authenticated;
GRANT  EXECUTE ON FUNCTION apv_afvis_forslag(uuid, text)  TO authenticated;

-- Hjælpefunktioner brugt af klient/views.
GRANT EXECUTE ON FUNCTION apv_er_admin()        TO authenticated;
GRANT EXECUTE ON FUNCTION apv_risikoniveau(int) TO authenticated;
