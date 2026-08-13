-- =============================================================
-- SMU APV — Flyt dokument-referencer til Supabase Storage
-- =============================================================
-- Erstatter OneDrive-linkene (fra 20260812113000) med Storage-referencer:
--   * apv-offentligt (public bucket) → gemmes som fuld public URL i "url".
--   * apv-internt   (privat bucket)  → gemmes som "bucket"+"path"; appen laver
--     en signeret URL ved klik (kræver storage-select-policyen for authenticated).
--
-- Ingen kobling går tabt — hver række får sit fulde dokument-array sat påny.
-- Foto forbliver et eksternt Google Photos-link. UPDATE pr. fast id → idempotent.
-- Kør EFTER at begge buckets er oprettet, filerne uploadet og apv-internt-policyen
-- er kørt.
--
-- Public base: https://ggnnfzhhqhwmugubfxuj.supabase.co/storage/v1/object/public/apv-offentligt/
-- =============================================================


-- ─── Kemikalier (SDS + arbejdsprocedure, alle offentlige) ───

UPDATE apv_kemikalier SET dokumenter = '[
  {"navn":"Sikkerhedsdatablad (SDS)","url":"https://ggnnfzhhqhwmugubfxuj.supabase.co/storage/v1/object/public/apv-offentligt/datablade/total-isopropanol-sds.pdf"},
  {"navn":"Arbejdsprocedure","url":"https://ggnnfzhhqhwmugubfxuj.supabase.co/storage/v1/object/public/apv-offentligt/arbejdsprocedurer/arbejdsprocedure-isopropanol.pdf"}
]'::jsonb WHERE id = 'a0000000-0000-4000-8000-0000000000a1';   -- Total Isopropanol

UPDATE apv_kemikalier SET dokumenter = '[
  {"navn":"Sikkerhedsdatablad (SDS)","url":"https://ggnnfzhhqhwmugubfxuj.supabase.co/storage/v1/object/public/apv-offentligt/datablade/avery-surface-cleaner-sds.pdf"}
]'::jsonb WHERE id = 'a0000000-0000-4000-8000-0000000000a2';   -- Avery Surface Cleaner

UPDATE apv_kemikalier SET dokumenter = '[
  {"navn":"Sikkerhedsdatablad (SDS)","url":"https://ggnnfzhhqhwmugubfxuj.supabase.co/storage/v1/object/public/apv-offentligt/datablade/orafol-pre-wrap-surface-cleaner-sds.pdf"}
]'::jsonb WHERE id = 'a0000000-0000-4000-8000-0000000000a3';   -- ORAFOL Pre-Wrap

UPDATE apv_kemikalier SET dokumenter = '[
  {"navn":"Sikkerhedsdatablad (SDS)","url":"https://ggnnfzhhqhwmugubfxuj.supabase.co/storage/v1/object/public/apv-offentligt/datablade/sott-right-off-2-sds.pdf"},
  {"navn":"Arbejdsprocedure","url":"https://ggnnfzhhqhwmugubfxuj.supabase.co/storage/v1/object/public/apv-offentligt/arbejdsprocedurer/arbejdsprocedure-right-off-2.pdf"}
]'::jsonb WHERE id = 'a0000000-0000-4000-8000-0000000000a4';   -- SOTT Right Off 2.0


-- ─── Maskiner (brugermanual offentlig; tjekliste + instruks private; foto eksternt) ───
-- Samme fire dokumenter for alle 6 sakselifte.

UPDATE apv_maskiner SET dokumenter = '[
  {"navn":"Brugermanual (Skyjack 3219)","url":"https://ggnnfzhhqhwmugubfxuj.supabase.co/storage/v1/object/public/apv-offentligt/brugsanvisninger/brugermanual-skyjack-3219.pdf"},
  {"navn":"Daglig tjekliste","bucket":"apv-internt","path":"arbejdsprocedurer/foer-ibrugtagning-lift.pdf"},
  {"navn":"Instruksskilt (sakselift)","bucket":"apv-internt","path":"arbejdsprocedurer/sakselift-instruks.pdf"},
  {"navn":"Fotodokumentation","url":"https://photos.app.goo.gl/cxrSTLCkRxqDiScx5"}
]'::jsonb WHERE id IN (
  'a0000000-0000-4000-8000-0000000000d1',
  'a0000000-0000-4000-8000-0000000000d2',
  'a0000000-0000-4000-8000-0000000000d3',
  'a0000000-0000-4000-8000-0000000000d4',
  'a0000000-0000-4000-8000-0000000000d5',
  'a0000000-0000-4000-8000-0000000000d6'
);


-- ─── Påbud (alle private i apv-internt/arbejdstilsyn) ───
-- APV Påbud får desuden besøgsrapporten koblet (jf. aftale).

UPDATE apv_paabud SET dokumenter = '[
  {"navn":"APV Påbud (PDF)","bucket":"apv-internt","path":"arbejdstilsyn/apv-paabud.pdf"},
  {"navn":"Besøgsrapport","bucket":"apv-internt","path":"arbejdstilsyn/besoegsrapport.pdf"}
]'::jsonb WHERE id = 'a0000000-0000-4000-8000-000000000071';

UPDATE apv_paabud SET dokumenter = '[
  {"navn":"Strakspåbud – Isopropanyl (PDF)","bucket":"apv-internt","path":"arbejdstilsyn/strakspaabud-isopropanyl.pdf"}
]'::jsonb WHERE id = 'a0000000-0000-4000-8000-000000000072';

UPDATE apv_paabud SET dokumenter = '[
  {"navn":"Strakspåbud lifte (PDF)","bucket":"apv-internt","path":"arbejdstilsyn/strakspaabud-lifte.pdf"}
]'::jsonb WHERE id = 'a0000000-0000-4000-8000-000000000073';
