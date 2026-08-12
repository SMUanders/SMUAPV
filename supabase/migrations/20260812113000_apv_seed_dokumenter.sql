-- =============================================================
-- SMU APV — Seed: dokument-URL'er fra Excel-hyperlinks
-- =============================================================
-- Excel-cellerne for SDS/brugsanvisning/tjekliste/foto/instruks/påbud havde
-- HYPERLINKS bag deres label-tekst. Den første seed importerede kun labels
-- (url=""). Denne migration udfylder de faktiske link-mål fra Excel.
--
-- Rører IKKE tidligere migrationer. UPDATE pr. fast id → idempotent og virker,
-- uanset om 20260812110500_apv_seed_excel.sql allerede er kørt (UPDATE på en
-- ikke-eksisterende række rammer 0 rækker; kør efter seed'en).
--
-- Kilde til URL'er:
--   * Påbud (ark "Strakspåbud"): fulde SharePoint-URL'er (fra Excels display).
--   * Øvrige (SDS/manual/procedure): Excel gemte RELATIVE stier. De er her sat
--     sammen med den SharePoint-base, som påbud-linkene beviser, til fulde URL'er.
--     Base: https://signmeup2-my.sharepoint.com/personal/anders_signmeup_dk/Documents/APV/
--   * Foto: ekstern Google Photos-URL (verbatim fra Excel).
--
-- BEMÆRK: linkene peger på en personlig OneDrive/SharePoint. For at HELE teamet
-- kan åbne dem skal APV-mappen være delt med @signmeup.dk. Faglige oplysninger
-- (H-sætninger/PPE/blandinger) er ikke rørt.
-- =============================================================


-- ─── Kemikalier: SDS (+ arbejdsprocedure hvor Excel havde link) ───

UPDATE apv_kemikalier SET dokumenter =
  '[{"navn":"Sikkerhedsdatablad (SDS)","url":"https://signmeup2-my.sharepoint.com/personal/anders_signmeup_dk/Documents/APV/Datablade/1209288_Total-Rent_Total-Isopropanol_DK-da_v1_0.pdf"},{"navn":"Arbejdsprocedure","url":"https://signmeup2-my.sharepoint.com/personal/anders_signmeup_dk/Documents/APV/M%C3%A6rkning%20og%20skilte/Arbejdsprocedure/Arbejdsprocedure%20Iso.pdf"}]'::jsonb
  WHERE id = 'a0000000-0000-4000-8000-0000000000a1';   -- Total Isopropanol

UPDATE apv_kemikalier SET dokumenter =
  '[{"navn":"Sikkerhedsdatablad (SDS)","url":"https://signmeup2-my.sharepoint.com/personal/anders_signmeup_dk/Documents/APV/Datablade/216010_SDS_AVERY__2_Surface_Cleaner_1L_120116_DK.pdf"}]'::jsonb
  WHERE id = 'a0000000-0000-4000-8000-0000000000a2';   -- Avery Surface Cleaner

UPDATE apv_kemikalier SET dokumenter =
  '[{"navn":"Sikkerhedsdatablad (SDS)","url":"https://signmeup2-my.sharepoint.com/personal/anders_signmeup_dk/Documents/APV/Datablade/orafol-359500030-pre-wrap-surface-cleaner-id4663-safety-data-sheet-europe-en.pdf"}]'::jsonb
  WHERE id = 'a0000000-0000-4000-8000-0000000000a3';   -- ORAFOL Pre-Wrap Surface Cleaner

UPDATE apv_kemikalier SET dokumenter =
  '[{"navn":"Sikkerhedsdatablad (SDS)","url":"https://signmeup2-my.sharepoint.com/personal/anders_signmeup_dk/Documents/APV/Datablade/527325_SDS_Sott_5_RIGHT_OFF_limfjerner_5L_021017_DK.pdf"},{"navn":"Arbejdsprocedure","url":"https://signmeup2-my.sharepoint.com/personal/anders_signmeup_dk/Documents/APV/M%C3%A6rkning%20og%20skilte/Arbejdsprocedure/Arbejdsprocedure%20Right%20Off%202.0.pdf"}]'::jsonb
  WHERE id = 'a0000000-0000-4000-8000-0000000000a4';   -- SOTT Right Off 2.0


-- ─── Maskiner: samme fire dokumenter for alle 6 sakselifte ───
-- Brugermanual, daglig tjekliste, instruksskilt, fotodokumentation.
-- (Service/Journal-kolonnen havde ingen hyperlink i Excel.)

UPDATE apv_maskiner SET dokumenter =
  '[{"navn":"Brugermanual (Skyjack 3219)","url":"https://signmeup2-my.sharepoint.com/personal/anders_signmeup_dk/Documents/APV/Brugsanvisninger/Brugermanual%20Skyjack%203219%20%20DK.pdf"},{"navn":"Daglig tjekliste","url":"https://signmeup2-my.sharepoint.com/personal/anders_signmeup_dk/Documents/APV/M%C3%A6rkning%20og%20skilte/Arbejdsprocedure/F%C3%B8r%20ibrugtagning%20lift.pdf"},{"navn":"Instruksskilt (sakselift)","url":"https://signmeup2-my.sharepoint.com/personal/anders_signmeup_dk/Documents/APV/M%C3%A6rkning%20og%20skilte/Arbejdsprocedure/Sakselift%20instruks.pdf"},{"navn":"Fotodokumentation","url":"https://photos.app.goo.gl/cxrSTLCkRxqDiScx5"}]'::jsonb
  WHERE id IN (
    'a0000000-0000-4000-8000-0000000000d1',
    'a0000000-0000-4000-8000-0000000000d2',
    'a0000000-0000-4000-8000-0000000000d3',
    'a0000000-0000-4000-8000-0000000000d4',
    'a0000000-0000-4000-8000-0000000000d5',
    'a0000000-0000-4000-8000-0000000000d6'
  );


-- ─── Påbud: fulde SharePoint-URL'er (verbatim fra Excels display) ───

UPDATE apv_paabud SET dokumenter =
  '[{"navn":"APV Påbud (PDF)","url":"https://signmeup2-my.sharepoint.com/personal/anders_signmeup_dk/Documents/APV/Arbejdstilsynet/APV%20p%C3%A5bud.pdf"}]'::jsonb
  WHERE id = 'a0000000-0000-4000-8000-000000000071';

UPDATE apv_paabud SET dokumenter =
  '[{"navn":"Strakspåbud – Isopropanyl (PDF)","url":"https://signmeup2-my.sharepoint.com/personal/anders_signmeup_dk/Documents/APV/Arbejdstilsynet/Straksp%C3%A5bud%20isopropanyl.pdf"}]'::jsonb
  WHERE id = 'a0000000-0000-4000-8000-000000000072';

UPDATE apv_paabud SET dokumenter =
  '[{"navn":"Strakspåbud lifte (PDF)","url":"https://signmeup2-my.sharepoint.com/personal/anders_signmeup_dk/Documents/APV/Arbejdstilsynet/Straksp%C3%A5bud%20lifte.pdf"}]'::jsonb
  WHERE id = 'a0000000-0000-4000-8000-000000000073';
