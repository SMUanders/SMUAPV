-- =============================================================
-- SMU APV — Fase 1: Beregnede views (on-read afledning)
-- =============================================================
-- Her lever de afledte værdier, der IKKE må være redigerbare sandhedsfelter:
--   * risikoniveau / risikoniveau_efter  (af score via apv_risikoniveau)
--   * seneste_eftersyn / naeste_eftersyn  (af apv_eftersyn + interval)
--
-- security_invoker = true → view'et respekterer den kaldende brugers RLS på
-- de underliggende tabeller (ellers ville et view køre som ejer og omgå RLS).
-- Kræver Postgres 15+ (Supabase). Re-runbar via DROP VIEW IF EXISTS.
-- =============================================================


-- ─── apv_fund_beriget — fund + udledt risikoniveau (før/efter) ───
DROP VIEW IF EXISTS apv_fund_beriget;
CREATE VIEW apv_fund_beriget
  WITH (security_invoker = true) AS
SELECT
  f.*,
  apv_risikoniveau(f.score)       AS risikoniveau,
  apv_risikoniveau(f.score_efter) AS risikoniveau_efter
FROM apv_fund f;


-- ─── apv_maskiner_beriget — maskine + udledt seneste/næste eftersyn ───
-- seneste_eftersyn = nyeste ikke-slettede eftersynspost.
-- naeste_eftersyn  = seneste_eftersyn + eftersyn_interval_mdr (kun hvis begge kendt).
DROP VIEW IF EXISTS apv_maskiner_beriget;
CREATE VIEW apv_maskiner_beriget
  WITH (security_invoker = true) AS
SELECT
  m.*,
  s.seneste_eftersyn,
  CASE
    WHEN s.seneste_eftersyn IS NOT NULL AND m.eftersyn_interval_mdr IS NOT NULL
      THEN (s.seneste_eftersyn + make_interval(months => m.eftersyn_interval_mdr))::date
    ELSE NULL
  END AS naeste_eftersyn
FROM apv_maskiner m
LEFT JOIN LATERAL (
  SELECT max(e.dato) AS seneste_eftersyn
  FROM apv_eftersyn e
  WHERE e.maskine_id = m.id AND NOT e.slettet
) s ON true;
