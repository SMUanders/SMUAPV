-- =============================================================
-- SMU APV — Periodisk eftersyn: ekstern udfører + mærkatnummer
-- =============================================================
-- Minimal, additiv udvidelse af apv_eftersyn, så et års-eftersyn udført af et
-- EKSTERNT servicefirma (fx "Jysk Lift Service ApS") kan registreres uden at
-- oprette en falsk medarbejder i profiler.
--
--   * udfoert_af_id (findes)     → intern person (profiler), nullable.
--   * udfoert_af_fritekst (NY)   → ekstern udfører/servicefirma, nullable.
--   * maerkat_nr (NY)            → eftersynsmærkatens nummer, nullable.
--
-- Alt eksisterende bevares (maskine_id, dato, resultat, note, dokumenter, audit).
-- RLS/grants dækker automatisk de nye kolonner (admin insert/update; alle læser).
-- apv_maskiner_beriget er urørt — seneste/næste eftersyn udledes fortsat af dato
-- + interval. Ingen dato hardcodes.
--
-- Additiv og re-runbar. Rører ingen eksisterende data eller andre objekter.
-- =============================================================

ALTER TABLE apv_eftersyn ADD COLUMN IF NOT EXISTS udfoert_af_fritekst text;
ALTER TABLE apv_eftersyn ADD COLUMN IF NOT EXISTS maerkat_nr          text;

COMMENT ON COLUMN apv_eftersyn.udfoert_af_fritekst IS
  'Ekstern udfører/servicefirma (fx "Jysk Lift Service ApS"), når eftersynet ikke er udført af en profiler-person. udfoert_af_id bruges til interne.';
COMMENT ON COLUMN apv_eftersyn.maerkat_nr IS
  'Eftersynsmærkatens nummer (fx "2025112074"). Rent referencefelt — må IKKE bruges til at udlede en udførelsesdato.';
