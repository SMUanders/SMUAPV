-- =============================================================
-- SMU APV — Omdøb de 6 sakselifte til stabile navne (KUN navn)
-- =============================================================
-- Ændrer UDELUKKENDE apv_maskiner.navn på de 6 eksisterende rækker (pr. id).
-- id, serienr, fabrikat_model, aargang, eftersyn, kontrol før brug, dokumenter,
-- område og alle relationer er URØRT. QR-URL'er bruger id → uændrede.
-- (updated_at sættes automatisk af touch-triggeren — audit, ikke et datafelt.)
-- =============================================================

update apv_maskiner set navn = 'Lift 01' where id = 'a0000000-0000-4000-8000-0000000000d1';  -- var INA
update apv_maskiner set navn = 'Lift 02' where id = 'a0000000-0000-4000-8000-0000000000d2';  -- var LISSY
update apv_maskiner set navn = 'Lift 03' where id = 'a0000000-0000-4000-8000-0000000000d3';  -- var ANDREAS
update apv_maskiner set navn = 'Lift 04' where id = 'a0000000-0000-4000-8000-0000000000d4';  -- var SASCHA
update apv_maskiner set navn = 'Lift 05' where id = 'a0000000-0000-4000-8000-0000000000d5';  -- var DANA
update apv_maskiner set navn = 'Lift 06' where id = 'a0000000-0000-4000-8000-0000000000d6';  -- var EKSTRA
