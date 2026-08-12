-- =============================================================
-- SMU APV — Seed: konkrete data fra "APV Signmeup.xlsx"
-- =============================================================
-- KUN faktisk udfyldte rækker. Ingen tomme/skabelon-rækker. #VALUE!-piktogrammer
-- importeres IKKE (piktogrammer = [] = markeret som manglende).
-- Faglig troskab: H-sætninger, PPE, blandingsforhold og datoer er gengivet
-- ordret fra Excel og må ikke ændres.
--
-- Excel-datoer er serienumre (1900-systemet) → konverteret med DATE '1899-12-30' + n.
-- Faste UUID'er + ON CONFLICT (id) DO NOTHING → migrationen er re-runbar.
-- Skrives direkte (kører som ejer, forbi RLS/forslagssystemet). created_by er null.
--
-- Kræver at 20260812110000_apv_opslag_felter.sql er kørt (forbrug/lagermaengde/
-- arbejdsprocedure/note-kolonner).
-- =============================================================


-- ─── Område ───────────────────────────────────────────────────
INSERT INTO apv_omraader (id, navn, beskrivelse, sort_order) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Værksted', NULL, 0)
ON CONFLICT (id) DO NOTHING;


-- ─── Kemikalier ───────────────────────────────────────────────
INSERT INTO apv_kemikalier
  (id, produktnavn, leverandoer, sds_dato, h_saetninger, piktogrammer, anvendelse,
   forbrug, lagermaengde, opbevaringssted, substitution_mulig, eksponeringsveje,
   ventilation, ppe, affald, dokumenter, arbejdsprocedure)
VALUES
  ('a0000000-0000-4000-8000-0000000000a1',
   'Total Isopropanol', 'Total Rent.dk', DATE '2024-06-02',
   '["H225: Meget brandfarlig væske og damp.","H319: Forårsager alvorlig øjenirritation.","H336: Kan forårsage sløvhed eller svimmelhed."]'::jsonb,
   '[]'::jsonb,
   'Affedtning før foliemontage. Blanding: 5 L isopropylalkohol + 15 L vand (25 % v/v). Fyld på spraypumpe. Spray i klud – ikke direkte på emnet – og aftør overfladen.',
   '1 liter ufortyndet', 'max 50 liter', 'Kemiskab', false,
   'hud; øjne; ånding (damp/aerosol – lav ved spray i klud)', 'Rum',
   'Nitrilhandsker EN 374; beskyttelsesbriller EN 166 m. sideskjold', 'Restaffald',
   '[{"navn":"Datablad","url":""}]'::jsonb, 'Dokument til udskrift'),

  ('a0000000-0000-4000-8000-0000000000a2',
   'Avery Surface Cleaner', 'Antalis', DATE '1899-12-30' + 43110,
   '["H225: Meget brandfarlig væske og damp.","H319: Forårsager alvorlig øjenirritation.","H336: Kan forårsage sløvhed eller svimmelhed.","H317: Kan forårsage allergisk hudreaktion.","H411: Giftig for vandlevende organismer med langvarige virkninger."]'::jsonb,
   '[]'::jsonb,
   'Overfladerens før foliemontage (professionel brug)',
   '0,5l', 'Max 10 liter', 'Kemiskab', false,
   'hud; øjne; ånding (spray/damp)', 'Rum',
   'Nitrilhandsker EN 374; briller EN 166 ved utilstrækkelig ventilation halvmaske EN 140 med A-filter',
   'klude/papir i lukket, brandmærket beholder',
   '[{"navn":"Datablad","url":""}]'::jsonb, NULL),

  ('a0000000-0000-4000-8000-0000000000a3',
   'ORAFOL® Pre-Wrap Surface Cleaner', 'Signcom', DATE '1899-12-30' + 44314,
   '["H225: Meget brandfarlig væske og damp.","H319: Forårsager alvorlig øjenirritation.","H336: Kan forårsage sløvhed eller svimmelhed."]'::jsonb,
   '[]'::jsonb,
   'Overfladeforrens før foliemontage (industriel/professionel brug)',
   '0,5l', 'Max 10 liter', 'Kemiskab', false,
   'hud; øjne; ånding (spray/damp)', 'Rum',
   'Kemikaliehansker NBR/PVA/Butyl/FKM, briller EN166 ved utilstrækkelig ventilation halvmaske EN 140 med A-filter',
   'klude/papir i lukket, brandmærket beholder',
   '[{"navn":"Datablad","url":""}]'::jsonb, NULL),

  ('a0000000-0000-4000-8000-0000000000a4',
   'SOTT Right Off 2.0', 'Scandraft', DATE '1899-12-30' + 43804,
   '["EUH210 - Ufarlig"]'::jsonb,
   '[]'::jsonb,
   'Fjernelse af klæberester efter folienedtagning: Påfør på klud (spray i klud – ikke på emnet), lad virke 1–3 min., løs med plastskraber, aftør; gentag ved behov. Efterrens med overfladerens.',
   '0,5l', 'Max 10 liter', 'Lager', false,
   'hud; øjne; ånding (spray/damp)', 'Rum',
   'Nitrilhandsker EN 374, tætsluttende briller EN 166; ved utilstrækkelig ventilation halvmaske EN 140 med A-filter',
   'klude/papir i lukket, brandmærket beholder',
   '[{"navn":"Datablad","url":""}]'::jsonb, 'Dokument til udskrift')
ON CONFLICT (id) DO NOTHING;


-- ─── KRV (kobles til Total Isopropanol) ───────────────────────
-- Excel B "Isopropanyl 20%" = fortyndet arbejdsopløsning af Total Isopropanol;
-- repræsenteres via kemikalie_id. H-sætninger stammer fra kemikaliet (ikke
-- dublet-lagret på KRV). Kun opgave/proces var udfyldt i Excel; resten er tomt.
INSERT INTO apv_krv (id, kemikalie_id, opgave_proces) VALUES
  ('a0000000-0000-4000-8000-0000000000b1',
   'a0000000-0000-4000-8000-0000000000a1', 'Affedtning af overflader')
ON CONFLICT (id) DO NOTHING;


-- ─── Maskiner (6 Skyjack-sakselifte) ──────────────────────────
-- Ansvarlig i Excel = "Bruger" (rolle, ikke navngiven person) → ansvarlig_id null.
-- Lokation "Værksted" → område ovenfor. Dokument-kolonner er labels (ingen links).
INSERT INTO apv_maskiner
  (id, type, navn, serienr, fabrikat_model, aargang, omraade_id, eftersyn_interval_mdr,
   daglig_tjek, status, dokumenter, note)
VALUES
  ('a0000000-0000-4000-8000-0000000000d1','Sakselift','INA','SJ3215-153025','Skyjack SJIII-3215',2006,'a0000000-0000-4000-8000-000000000001',12,true,'ok','[{"navn":"Brugermanual Skyjack","url":""},{"navn":"Template (tjekliste)","url":""},{"navn":"Fotodokumentation","url":""}]'::jsonb,'Instruksskilt'),
  ('a0000000-0000-4000-8000-0000000000d2','Sakselift','LISSY','SJ3215-10001144','Skyjack SJIII-3215',2015,'a0000000-0000-4000-8000-000000000001',12,true,'ok','[{"navn":"Brugermanual Skyjack","url":""},{"navn":"Template (tjekliste)","url":""},{"navn":"Fotodokumentation","url":""}]'::jsonb,'Instruksskilt'),
  ('a0000000-0000-4000-8000-0000000000d3','Sakselift','ANDREAS','SJ3215-10003595','Skyjack SJIII-3215',2018,'a0000000-0000-4000-8000-000000000001',12,true,'ok','[{"navn":"Brugermanual Skyjack","url":""},{"navn":"Template (tjekliste)","url":""},{"navn":"Fotodokumentation","url":""}]'::jsonb,'Instruksskilt'),
  ('a0000000-0000-4000-8000-0000000000d4','Sakselift','SASCHA','SJ3215-152359','Skyjack SJIII-3215',2004,'a0000000-0000-4000-8000-000000000001',12,true,'ok','[{"navn":"Brugermanual Skyjack","url":""},{"navn":"Template (tjekliste)","url":""},{"navn":"Fotodokumentation","url":""}]'::jsonb,'Instruksskilt'),
  ('a0000000-0000-4000-8000-0000000000d5','Sakselift','DANA','SJ3215-A100026909','Skyjack SJIII-3215',2023,'a0000000-0000-4000-8000-000000000001',12,true,'ok','[{"navn":"Brugermanual Skyjack","url":""},{"navn":"Template (tjekliste)","url":""},{"navn":"Fotodokumentation","url":""}]'::jsonb,'Instruksskilt'),
  ('a0000000-0000-4000-8000-0000000000d6','Sakselift','EKSTRA','SJ3215-10001147','Skyjack SJIII-3215',2015,'a0000000-0000-4000-8000-000000000001',12,true,'ok','[{"navn":"Brugermanual Skyjack","url":""},{"navn":"Template (tjekliste)","url":""},{"navn":"Fotodokumentation","url":""}]'::jsonb,'Instruksskilt')
ON CONFLICT (id) DO NOTHING;


-- ─── Eftersyn (Excel "Sidste eftersyn" = serienr 45597) ───────
-- Næste eftersyn beregnes af view'et (seneste + interval). Excel J (45962) svarer.
INSERT INTO apv_eftersyn (id, maskine_id, dato, resultat) VALUES
  ('a0000000-0000-4000-8000-0000000000e1','a0000000-0000-4000-8000-0000000000d1', DATE '1899-12-30' + 45597, 'ok'),
  ('a0000000-0000-4000-8000-0000000000e2','a0000000-0000-4000-8000-0000000000d2', DATE '1899-12-30' + 45597, 'ok'),
  ('a0000000-0000-4000-8000-0000000000e3','a0000000-0000-4000-8000-0000000000d3', DATE '1899-12-30' + 45597, 'ok'),
  ('a0000000-0000-4000-8000-0000000000e4','a0000000-0000-4000-8000-0000000000d4', DATE '1899-12-30' + 45597, 'ok'),
  ('a0000000-0000-4000-8000-0000000000e5','a0000000-0000-4000-8000-0000000000d5', DATE '1899-12-30' + 45597, 'ok'),
  ('a0000000-0000-4000-8000-0000000000e6','a0000000-0000-4000-8000-0000000000d6', DATE '1899-12-30' + 45597, 'ok')
ON CONFLICT (id) DO NOTHING;


-- ─── Fund (APV-screening) ─────────────────────────────────────
-- titel = Excel "Problem/risiko". "Forslag til løsning" (Excel J) foldet ind i
-- nuvaerende_foranstaltninger med label (ingen selvstændig kolonne). Ansvarlig
-- "AP" kan ikke mappes til profiler → ansvarlig_id null. "Sker nu?"/score droppes
-- (score er beregnet). Deadline "NU" → null.
INSERT INTO apv_fund
  (id, omraade_id, titel, beskrivelse, kilde_aarsag, saerlige_grupper,
   alvor, sandsynlighed, nuvaerende_foranstaltninger, status, deadline)
VALUES
  ('a0000000-0000-4000-8000-0000000000f1','a0000000-0000-4000-8000-000000000001',
   'Gelænder klappet ned under brug, ikke lovligt i flg. Brugsanvisning', NULL,
   'Det gøres for bedre arbejdstilling.', 'Nej', 5, 5,
   E'Gælendere er straks klappet op og alle fæstningspunkter sikret.\nForslag til løsning: Udført straks',
   'loest', NULL),

  ('a0000000-0000-4000-8000-0000000000f2','a0000000-0000-4000-8000-000000000001',
   'Værnemidler bruges ikke ved aftøring med fortyndet isopropylalkohol', NULL,
   'Tanketorsk, værnemidlerne er til rådighed', 'Nej', 5, 5,
   E'Samlet briefing, straks efter besøg. Alle har forstået alvoren og ibrugtagningen af værnemidler straks sat i gang. Ydermere er der bestilt nye typer handsker til test.\nForslag til løsning: Udført straks',
   'loest', NULL),

  ('a0000000-0000-4000-8000-0000000000f3','a0000000-0000-4000-8000-000000000001',
   'Afmærkning af sprayflasker', NULL,
   'Etiketter ikke påklistret med information om indhold', 'Nej', 5, 5,
   E'Samlet briefing om vigtigheden af at mærkerne som er til rådighed bruges som aftalt.\nForslag til løsning: Udført straks',
   'loest', NULL),

  ('a0000000-0000-4000-8000-0000000000f4', NULL,
   'Sundhedsskadeligt og farligt affald',
   'Område/aktivitet i APV-ark: Total Isopropanol',
   'Afgiver farlige dampe, klude bør afskaffes som farligt affald', 'Nej', 1, 5,
   E'Briller og handsker\nForslag til løsning: Undersøg substitution',
   'i_gang', DATE '1899-12-30' + 45962)
ON CONFLICT (id) DO NOTHING;


-- ─── Handling (APV-handlingsplan) ─────────────────────────────
-- Ansvarlig "AP" → null. Deadline "Ukendt" → null. Dokumentation-note foldet ind
-- i beskrivelse. Ikke koblet til fund/påbud (Excel angav ingen eksplicit kobling).
INSERT INTO apv_handlinger
  (id, titel, beskrivelse, prioritet, startdato, deadline, opfoelgning_dato,
   ressourcer_udgift, status)
VALUES
  ('a0000000-0000-4000-8000-000000000091',
   'Udforsk muligheden for CE godkendt, lavere rækværk til sakslifte ved trailermontering',
   E'Et fuldt opslået gelænder forringer arbejdsstillingen ved montering af folie på trailer., ligesom risikoen for at snuble øges jo flere gange man skal ind og ud af liften.\n\nDokumentation: Jysk Lift er kontaktet og dialog sættes i gang',
   'hoej', DATE '1899-12-30' + 45903, NULL, DATE '1899-12-30' + 45910,
   '100000', 'i_gang')
ON CONFLICT (id) DO NOTHING;


-- ─── Påbud (Strakspåbud-arket) ────────────────────────────────
-- Status: "Ig." → i_gang, "Løst" → afsluttet. Titel = Excel "Afgørelse".
INSERT INTO apv_paabud
  (id, type, myndighed, titel, dato_modtaget, status, dato_tilbagemelding)
VALUES
  ('a0000000-0000-4000-8000-000000000071','paabud','Arbejdstilsynet','APV Påbud',
   DATE '1899-12-30' + 45897, 'i_gang', NULL),
  ('a0000000-0000-4000-8000-000000000072','strakspaabud','Arbejdstilsynet','Strakspåbud - Isopropanyl',
   DATE '1899-12-30' + 45897, 'afsluttet', DATE '1899-12-30' + 45904),
  ('a0000000-0000-4000-8000-000000000073','strakspaabud','Arbejdstilsynet','Strakspåbud lift',
   DATE '1899-12-30' + 45897, 'afsluttet', NULL)
ON CONFLICT (id) DO NOTHING;
