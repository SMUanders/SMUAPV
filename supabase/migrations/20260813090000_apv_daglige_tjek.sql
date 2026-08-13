-- =============================================================
-- SMU APV — Daglig tjekliste for sakselifte (immutable sikkerhedslog)
-- =============================================================
-- Bevidst ANDEN model end forslag→godkendelse: en almindelig authenticated
-- medarbejder gennemfører selv et dagligt tjek. Historikken er uforanderlig.
--
-- Sikkerhedsdesign:
--   * Tabellerne har KUN SELECT for authenticated. INGEN insert/update/delete
--     (hverken GRANT eller policy) → klienten kan aldrig skrive direkte, aldrig
--     rette/slette historik.
--   * Al skrivning sker via ÉN kontrolleret RPC (apv_opret_dagligt_tjek,
--     SECURITY DEFINER) der er den eneste write-vej. RPC'en fastsætter selv
--     bruger (auth.uid()), tidspunkt (current_date/now), maskine-validering,
--     tilladte resultater og SAMLET STATUS. Frontend kan ikke spoofe bruger og
--     kan ikke sende status='godkendt', hvis et punkt har 'fejl'.
--   * Header + punkter oprettes ATOMISK i én transaktion (én plpgsql-funktion),
--     så vi aldrig får en header uden punkter eller omvendt.
--
-- Re-runbar. Rører ingen eksisterende objekter.
-- =============================================================


-- ─── Tabeller ────────────────────────────────────────────────

-- Header: én uforanderlig registrering pr. gennemført kontrol.
CREATE TABLE IF NOT EXISTS apv_daglige_tjek (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maskine_id      uuid NOT NULL REFERENCES apv_maskiner(id),
  dato            date NOT NULL DEFAULT current_date,
  udfoert_af_id   uuid REFERENCES public.profiler(id),
  udfoert_af_navn text,                       -- audit-snapshot (som apv_forslag.created_by_navn)
  status          text NOT NULL CHECK (status IN ('godkendt', 'fejl')),
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS apv_daglige_tjek_maskine_idx
  ON apv_daglige_tjek (maskine_id, created_at DESC);

-- Punkter: snapshot af hvert kontrolpunkt for det enkelte tjek.
CREATE TABLE IF NOT EXISTS apv_daglige_tjek_punkter (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tjek_id      uuid NOT NULL REFERENCES apv_daglige_tjek(id) ON DELETE CASCADE,
  punkt_nr     int  NOT NULL,
  punkt_tekst  text NOT NULL,                 -- snapshot af kontrolpunktets tekst
  resultat     text NOT NULL CHECK (resultat IN ('ok', 'fejl', 'ikke_relevant')),
  note         text,
  foto_path    text                            -- plads til V2 (privat storage) — ikke brugt nu
);
CREATE INDEX IF NOT EXISTS apv_daglige_tjek_punkter_tjek_idx
  ON apv_daglige_tjek_punkter (tjek_id);


-- ─── RLS + grants: læs for alle authenticated; INGEN direkte skrivning ───

ALTER TABLE apv_daglige_tjek         ENABLE ROW LEVEL SECURITY;
ALTER TABLE apv_daglige_tjek_punkter ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON apv_daglige_tjek         TO authenticated;
GRANT SELECT ON apv_daglige_tjek_punkter TO authenticated;
-- Bevidst INGEN insert/update/delete-grant: al skrivning går via RPC'en.

DROP POLICY IF EXISTS "apv_dagligt_tjek_select"         ON apv_daglige_tjek;
DROP POLICY IF EXISTS "apv_dagligt_tjek_punkter_select" ON apv_daglige_tjek_punkter;

CREATE POLICY "apv_dagligt_tjek_select"
  ON apv_daglige_tjek FOR SELECT TO authenticated USING (true);

CREATE POLICY "apv_dagligt_tjek_punkter_select"
  ON apv_daglige_tjek_punkter FOR SELECT TO authenticated USING (true);

-- Ingen insert/update/delete-policy → uforanderlig historik fra frontend.


-- ─── RPC: eneste write-vej, atomisk + server-fastsat ───
-- p_punkter: jsonb-array af {punkt_nr:int, punkt_tekst:text, resultat:text, note:text}
-- Returnerer id på det oprettede tjek.
CREATE OR REPLACE FUNCTION apv_opret_dagligt_tjek(
  p_maskine_id uuid,
  p_punkter    jsonb,
  p_note       text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bruger  uuid := auth.uid();
  v_navn    text;
  v_status  text := 'godkendt';
  v_tjek_id uuid;
  r         jsonb;
BEGIN
  -- 1) Kræver login (bruger kommer fra JWT — kan ikke spoofes af klienten).
  IF v_bruger IS NULL THEN
    RAISE EXCEPTION 'Kræver login';
  END IF;

  -- 2) Maskinen skal findes og ikke være slettet.
  IF NOT EXISTS (SELECT 1 FROM apv_maskiner WHERE id = p_maskine_id AND NOT slettet) THEN
    RAISE EXCEPTION 'Ukendt maskine';
  END IF;

  -- 3) Punkter skal være en ikke-tom array.
  IF p_punkter IS NULL OR jsonb_typeof(p_punkter) <> 'array' OR jsonb_array_length(p_punkter) = 0 THEN
    RAISE EXCEPTION 'Mindst ét kontrolpunkt kræves';
  END IF;

  -- 4) Valider hvert punkt og udled SAMLET status (fejl vinder).
  FOR r IN SELECT * FROM jsonb_array_elements(p_punkter) LOOP
    IF (r->>'punkt_nr') IS NULL OR btrim(coalesce(r->>'punkt_tekst','')) = '' THEN
      RAISE EXCEPTION 'Punkt mangler nr eller tekst';
    END IF;
    IF (r->>'resultat') NOT IN ('ok', 'fejl', 'ikke_relevant') THEN
      RAISE EXCEPTION 'Ugyldigt resultat: %', r->>'resultat';
    END IF;
    IF (r->>'resultat') = 'fejl' THEN
      v_status := 'fejl';
    END IF;
  END LOOP;

  -- 5) Navn-snapshot fra profiler (audit-mønster).
  SELECT fuldt_navn INTO v_navn FROM public.profiler WHERE id = v_bruger;

  -- 6) Header — bruger/tid/status fastsættes HER, ikke af klienten.
  INSERT INTO apv_daglige_tjek (maskine_id, dato, udfoert_af_id, udfoert_af_navn, status, note, created_by)
  VALUES (p_maskine_id, current_date, v_bruger, v_navn, v_status,
          nullif(btrim(coalesce(p_note, '')), ''), v_bruger)
  RETURNING id INTO v_tjek_id;

  -- 7) Punkter — whitelist via jsonb_to_recordset (foto_path kan ikke sættes fra klient).
  INSERT INTO apv_daglige_tjek_punkter (tjek_id, punkt_nr, punkt_tekst, resultat, note)
  SELECT v_tjek_id, x.punkt_nr, x.punkt_tekst, x.resultat,
         nullif(btrim(coalesce(x.note, '')), '')
  FROM jsonb_to_recordset(p_punkter) AS x(punkt_nr int, punkt_tekst text, resultat text, note text);

  RETURN v_tjek_id;
END;
$$;

-- Kun authenticated må kalde RPC'en (intern login-tjek gater den yderligere).
REVOKE EXECUTE ON FUNCTION apv_opret_dagligt_tjek(uuid, jsonb, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION apv_opret_dagligt_tjek(uuid, jsonb, text) TO authenticated;
