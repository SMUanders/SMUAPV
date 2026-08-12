-- =============================================================
-- SMU APV — Fase 1: Skema + hjælpefunktioner
-- Kør i Supabase SQL Editor (SAMME projekt som SMU OS / SMU Wiki).
-- Alle objekter har apv_-prefix og er helt adskilt fra OS- og Wiki-objekter.
-- INGEN eksisterende OS-/Wiki-tabeller, -policies eller -funktioner ændres.
-- Re-runbar: CREATE TABLE/INDEX IF NOT EXISTS + CREATE OR REPLACE.
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- Hjælpefunktioner
-- ─────────────────────────────────────────────────────────────

-- Touch updated_at ved UPDATE. Rører ingen tabeller → tom search_path.
CREATE OR REPLACE FUNCTION apv_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Er den aktuelle bruger admin? Læser den DELTE profiler-tabel.
-- SECURITY DEFINER + fast search_path → ingen RLS-rekursion, intet search_path-angreb.
-- Kræver BÅDE rolle='admin' OG aktiv=true (deaktiveret admin har ingen adgang).
CREATE OR REPLACE FUNCTION apv_er_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiler
    WHERE id = auth.uid() AND rolle = 'admin' AND aktiv = true
  );
$$;

-- Udled risikoniveau af en score (1–25). DETTE er den ENESTE kilde til
-- V1-tærsklerne. Niveauet lagres ALDRIG — det udledes on-read i views/klient.
-- Ændring af tærskler = CREATE OR REPLACE af denne funktion. INGEN datamigration.
CREATE OR REPLACE FUNCTION apv_risikoniveau(p_score int)
RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN p_score IS NULL   THEN NULL
    WHEN p_score <= 4      THEN 'lav'
    WHEN p_score <= 9      THEN 'middel'
    WHEN p_score <= 14     THEN 'hoej'
    ELSE                        'kritisk'
  END;
$$;


-- ─────────────────────────────────────────────────────────────
-- apv_omraader — register/lookup (områder/lokationer)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apv_omraader (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  navn        text NOT NULL,
  beskrivelse text,
  sort_order  int  NOT NULL DEFAULT 0,
  slettet     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES auth.users(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS apv_omraader_navn_unik
  ON apv_omraader (lower(navn)) WHERE NOT slettet;
CREATE OR REPLACE TRIGGER apv_omraader_touch
  BEFORE UPDATE ON apv_omraader FOR EACH ROW EXECUTE FUNCTION apv_touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- apv_kemikalier — register (produkter, SDS/CLP)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apv_kemikalier (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produktnavn       text NOT NULL,
  leverandoer       text,
  sds_dato          date,
  h_saetninger      jsonb NOT NULL DEFAULT '[]'::jsonb,   -- liste af H-sætninger
  piktogrammer      jsonb NOT NULL DEFAULT '[]'::jsonb,   -- liste af farepiktogrammer
  anvendelse        text,
  opbevaringssted   text,
  ppe               text,
  eksponeringsveje  text,
  ventilation       text,
  substitution_mulig boolean,
  affald            text,
  dokumenter        jsonb NOT NULL DEFAULT '[]'::jsonb,   -- liste af {navn, url} (SDS m.m.)
  slettet           boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid REFERENCES auth.users(id),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid REFERENCES auth.users(id)
);
CREATE OR REPLACE TRIGGER apv_kemikalier_touch
  BEFORE UPDATE ON apv_kemikalier FOR EACH ROW EXECUTE FUNCTION apv_touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- apv_maskiner — register (maskiner/udstyr)
-- seneste_/naeste_eftersyn er IKKE kolonner her — de udledes af
-- apv_eftersyn i view'et apv_maskiner_beriget (se _views-migration).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apv_maskiner (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type                text,
  navn                text NOT NULL,
  serienr             text,
  fabrikat_model      text,
  aargang             int,
  omraade_id          uuid REFERENCES apv_omraader(id),
  ansvarlig_id        uuid REFERENCES public.profiler(id),
  eftersyn_interval_mdr int CHECK (eftersyn_interval_mdr > 0),
  daglig_tjek         boolean NOT NULL DEFAULT false,
  status              text NOT NULL DEFAULT 'ok'
                        CHECK (status IN ('ok', 'anmaerkning', 'ude_af_drift')),
  dokumenter          jsonb NOT NULL DEFAULT '[]'::jsonb,
  slettet             boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid REFERENCES auth.users(id),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS apv_maskiner_omraade_idx ON apv_maskiner (omraade_id);
CREATE OR REPLACE TRIGGER apv_maskiner_touch
  BEFORE UPDATE ON apv_maskiner FOR EACH ROW EXECUTE FUNCTION apv_touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- apv_paabud — myndighedssag (arbejdsflow)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apv_paabud (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type                text NOT NULL DEFAULT 'paabud'
                        CHECK (type IN ('strakspaabud', 'paabud', 'vejledning')),
  myndighed           text NOT NULL DEFAULT 'Arbejdstilsynet',
  titel               text NOT NULL,
  krav                text,
  dato_modtaget       date,
  ansvarlig_id        uuid REFERENCES public.profiler(id),
  frist               date,
  status              text NOT NULL DEFAULT 'modtaget'
                        CHECK (status IN ('modtaget', 'i_gang', 'afventer_at', 'afsluttet')),
  dato_tilbagemelding date,
  dokumenter          jsonb NOT NULL DEFAULT '[]'::jsonb,
  slettet             boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid REFERENCES auth.users(id),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS apv_paabud_status_idx ON apv_paabud (status);
CREATE OR REPLACE TRIGGER apv_paabud_touch
  BEFORE UPDATE ON apv_paabud FOR EACH ROW EXECUTE FUNCTION apv_touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- apv_fund — fund/observation (hjertet i APV-arbejdsflowet)
-- score/score_efter er GENEREREDE (kan ikke indtastes frit).
-- risikoniveau lagres IKKE — udledes on-read (apv_risikoniveau).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apv_fund (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  omraade_id          uuid REFERENCES apv_omraader(id),
  titel               text NOT NULL,
  beskrivelse         text,
  kilde_aarsag        text,
  saerlige_grupper    text,
  alvor               smallint CHECK (alvor BETWEEN 1 AND 5),
  sandsynlighed       smallint CHECK (sandsynlighed BETWEEN 1 AND 5),
  score               int GENERATED ALWAYS AS (alvor * sandsynlighed) STORED,
  alvor_efter         smallint CHECK (alvor_efter BETWEEN 1 AND 5),
  sandsynlighed_efter smallint CHECK (sandsynlighed_efter BETWEEN 1 AND 5),
  score_efter         int GENERATED ALWAYS AS (alvor_efter * sandsynlighed_efter) STORED,
  nuvaerende_foranstaltninger text,
  ansvarlig_id        uuid REFERENCES public.profiler(id),
  status              text NOT NULL DEFAULT 'ny'
                        CHECK (status IN ('ny', 'i_gang', 'loest', 'risiko_accepteret', 'lukket')),
  deadline            date,
  dokumenter          jsonb NOT NULL DEFAULT '[]'::jsonb,
  slettet             boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid REFERENCES auth.users(id),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS apv_fund_status_idx   ON apv_fund (status) WHERE NOT slettet;
CREATE INDEX IF NOT EXISTS apv_fund_omraade_idx  ON apv_fund (omraade_id);
CREATE INDEX IF NOT EXISTS apv_fund_ansvarlig_idx ON apv_fund (ansvarlig_id);
CREATE OR REPLACE TRIGGER apv_fund_touch
  BEFORE UPDATE ON apv_fund FOR EACH ROW EXECUTE FUNCTION apv_touch_updated_at();

COMMENT ON COLUMN apv_fund.score IS 'Beregnet = alvor * sandsynlighed. Kan ikke indtastes.';
COMMENT ON COLUMN apv_fund.score_efter IS 'Beregnet = alvor_efter * sandsynlighed_efter. Kan ikke indtastes.';


-- ─────────────────────────────────────────────────────────────
-- apv_eftersyn — logget eftersyn pr. maskine (kilde til sandhed)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apv_eftersyn (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maskine_id    uuid NOT NULL REFERENCES apv_maskiner(id),
  dato          date NOT NULL,
  udfoert_af_id uuid REFERENCES public.profiler(id),
  resultat      text NOT NULL CHECK (resultat IN ('ok', 'anmaerkning', 'kasseret')),
  note          text,
  dokumenter    jsonb NOT NULL DEFAULT '[]'::jsonb,
  slettet       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS apv_eftersyn_maskine_dato_idx
  ON apv_eftersyn (maskine_id, dato DESC) WHERE NOT slettet;
CREATE OR REPLACE TRIGGER apv_eftersyn_touch
  BEFORE UPDATE ON apv_eftersyn FOR EACH ROW EXECUTE FUNCTION apv_touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- apv_krv — kemisk risikovurdering (altid koblet til et kemikalie)
-- score_foer/score_efter er GENEREREDE.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apv_krv (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kemikalie_id          uuid NOT NULL REFERENCES apv_kemikalier(id),
  opgave_proces         text NOT NULL,
  maengde               text,
  varighed              text,
  hyppighed             text,
  arbejdsform           text,
  ventilation           text,
  eksponeret_antal      int,
  graensevaerdi_relevant boolean,
  alvor_foer            smallint CHECK (alvor_foer BETWEEN 1 AND 5),
  sandsynlighed_foer    smallint CHECK (sandsynlighed_foer BETWEEN 1 AND 5),
  score_foer            int GENERATED ALWAYS AS (alvor_foer * sandsynlighed_foer) STORED,
  foranstaltninger      text,
  instruktion_dato      date,
  kontrol_tilsyn        text,
  alvor_efter           smallint CHECK (alvor_efter BETWEEN 1 AND 5),
  sandsynlighed_efter   smallint CHECK (sandsynlighed_efter BETWEEN 1 AND 5),
  score_efter           int GENERATED ALWAYS AS (alvor_efter * sandsynlighed_efter) STORED,
  acceptabel            boolean,
  dokumenter            jsonb NOT NULL DEFAULT '[]'::jsonb,
  slettet               boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid REFERENCES auth.users(id),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS apv_krv_kemikalie_idx ON apv_krv (kemikalie_id);
CREATE OR REPLACE TRIGGER apv_krv_touch
  BEFORE UPDATE ON apv_krv FOR EACH ROW EXECUTE FUNCTION apv_touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- apv_handlinger — tiltag. Kan stå frit ELLER koble til fund/påbud.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apv_handlinger (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id          uuid REFERENCES apv_fund(id),
  paabud_id        uuid REFERENCES apv_paabud(id),
  titel            text NOT NULL,
  beskrivelse      text,
  prioritet        text NOT NULL DEFAULT 'middel'
                     CHECK (prioritet IN ('hoej', 'middel', 'lav')),
  ansvarlig_id     uuid REFERENCES public.profiler(id),
  startdato        date,
  deadline         date,
  opfoelgning_dato date,
  ressourcer_udgift text,
  status           text NOT NULL DEFAULT 'planlagt'
                     CHECK (status IN ('planlagt', 'i_gang', 'faerdig', 'annulleret')),
  dokumenter       jsonb NOT NULL DEFAULT '[]'::jsonb,
  slettet          boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid REFERENCES auth.users(id),
  -- En handling må pege på fund ELLER påbud — ikke begge samtidig.
  CONSTRAINT apv_handling_kilde_check
    CHECK (NOT (fund_id IS NOT NULL AND paabud_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS apv_handlinger_fund_idx   ON apv_handlinger (fund_id);
CREATE INDEX IF NOT EXISTS apv_handlinger_paabud_idx ON apv_handlinger (paabud_id);
CREATE INDEX IF NOT EXISTS apv_handlinger_status_idx ON apv_handlinger (status) WHERE NOT slettet;
CREATE OR REPLACE TRIGGER apv_handlinger_touch
  BEFORE UPDATE ON apv_handlinger FOR EACH ROW EXECUTE FUNCTION apv_touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- apv_forslag — generisk forslags-indbakke (system)
-- payload er KUN et snapshot af forslaget. De typed domænetabeller
-- ovenfor er altid den autoritative sandhed.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apv_forslag (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entitet         text NOT NULL
                    CHECK (entitet IN ('omraade', 'fund', 'handling', 'kemikalie',
                                       'krv', 'maskine', 'eftersyn', 'paabud')),
  operation       text NOT NULL CHECK (operation IN ('opret', 'ret', 'slet')),
  maal_id         uuid,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  begrundelse     text,
  status          text NOT NULL DEFAULT 'afventer'
                    CHECK (status IN ('afventer', 'godkendt', 'afvist')),
  afvisning_note  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_by_navn text,
  behandlet_at    timestamptz,
  behandlet_by    uuid REFERENCES auth.users(id),
  -- opret må ikke pege på en række; ret/slet SKAL pege på en række.
  CONSTRAINT apv_forslag_maal_check CHECK (
    (operation = 'opret' AND maal_id IS NULL) OR
    (operation IN ('ret', 'slet') AND maal_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS apv_forslag_status_idx  ON apv_forslag (status);
CREATE INDEX IF NOT EXISTS apv_forslag_creator_idx ON apv_forslag (created_by);
CREATE INDEX IF NOT EXISTS apv_forslag_maal_idx    ON apv_forslag (entitet, maal_id);

-- Visningsnavn udledes SERVER-SIDE fra profiler → kan ikke spoofes af klienten.
CREATE OR REPLACE FUNCTION apv_forslag_set_navn()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT fuldt_navn INTO NEW.created_by_navn FROM public.profiler WHERE id = auth.uid();
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER apv_forslag_set_navn_trg
  BEFORE INSERT ON apv_forslag FOR EACH ROW EXECUTE FUNCTION apv_forslag_set_navn();
