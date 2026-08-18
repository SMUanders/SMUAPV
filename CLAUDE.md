# SMU APV — satellit-app i SMU/Signmeup-universet

> **SMU Platform.** Dette repo er en del af SMU Platform. Fælles platform-sandhed og sandhedshierarki ligger i
> `smu-os-v2`'s Truth Reset-dokumenter (`PROJECT_OVERVIEW`/`DOMAIN_MODEL`/`DESIGNKATALOG`/`ROADMAP`/`NEXT_STEPS`/`PLANNING`),
> `SMU_APP_STANDARD.md` og det globale Claude Code-lag. Ved konflikt vinder platformens sandhedshierarki.
> Denne fil beskriver kun app-specifikke forhold.

**SMU APV** (arbejdsmiljøsystem / digital APV) er en lille, fokuseret app i
SMU-familien. Den **deler Supabase-projekt, auth og designunivers** med resten.
Navet og den kanoniske kilde er **`smu-os-v2`**; nærmeste tekniske skabelon er
**SMU Wiki**.

- **Standard:** følg `SMU_APP_STANDARD.md` (kopi i roden) — stack, backend, auth,
  sikkerhed, deploy, arbejdsmåde.
- **Design:** følg `SMU_DESIGN_SYSTEM.md` (kopi i roden). Kilde til farver,
  typografi og hjælpeklasser. Ved tvivl vinder `smu-os-v2/src/index.css`.
- **Arkitektur:** `PROJECT_OVERVIEW.md` (produkt/scope) + `DOMAIN_MODEL.md`
  (entiteter, relationer, statusflows, beregnede værdier). **Læs disse før
  domænearbejde.**
- **Tabel-prefix:** denne app bruger **`apv_`** i det delte Supabase-projekt.
  `profiler` + `auth.users` deles på tværs af apps — læs dem, opret dem ikke igen.

## Status — Fase 2 + opslagsværk + dokument-Storage kørt

Fase 0 (scaffold) → Fase 1 (database) → Fase 2 (fund forslag→godkendelse) →
opslags-fase (kemikalier/maskiner/påbud + søgning + Excel-seed) → dokumenter
flyttet til Supabase Storage — alle kørt/integreret i det delte Supabase-projekt.

**Dokument-Storage:**
- To buckets: `apv-offentligt` (public URLs: SDS, brugermanual, arbejdsprocedurer)
  og `apv-internt` (privat: tjeklister, instrukser, påbud, besøgsrapport).
- `apv-internt` har RLS-select-policy (`apv_internt_laes`, kun `authenticated`);
  ingen skrive-policy → ingen frontend-upload. Upload sker via Dashboard.
- `dokumenter`-felter: offentlige som `{navn,url}`, private som `{navn,bucket,path}`
  (signeret URL ved klik via `signeretUrl()`). PDF'er vises i indlejret fremviser
  (`Dokumenter`/`DokumentVis` i `Vis.tsx`); ikke-PDF-links åbnes i ny fane.
- Migrationer: `..._apv_internt_storage_policy.sql`, `..._apv_dokumenter_storage.sql`
  (erstatter OneDrive-linkene fra `..._apv_seed_dokumenter.sql`).
- Fil-upload FRA appen er stadig ikke bygget (upload via Dashboard/service-role).

**Opslags-fase — UI + data:**
- `/` er nu opslags-forside: stor søgning på tværs af kemikalier/maskiner/fund/
  påbud + indgangskort. Ingen BI-dashboard.
- Læsesider: `/kemikalier` (+ KRV kontekstuelt), `/maskiner` (seneste/næste
  eftersyn via `apv_maskiner_beriget`), `/paabud`, `/fund`. Delte visnings-
  primitiver i `src/components/Vis.tsx`; datalag udvidet i `src/lib/apvApi.ts`.
- Migrationer: `..._apv_opslag_felter.sql` (additive kolonner: kemikalier
  `forbrug/lagermaengde/arbejdsprocedure`, maskiner `note`),
  `..._apv_seed_excel.sql` (konkrete Excel-rækker — kun udfyldte; ingen
  `#VALUE!`-piktogrammer), `..._apv_seed_dokumenter.sql` (SDS/manual/tjekliste/
  påbud-links fra Excels hyperlinks). Dokumenter er link/reference — **ikke**
  fil-upload (Supabase Storage er stadig V2).
- Faglig troskab: H-sætninger, PPE, blandingsforhold og datoer er gengivet ordret
  fra `APV Signmeup.xlsx`.

**Fase 2 — fund forslag→godkendelse (UI):**
- Fund-register (`/fund` liste + detalje), foreslå nyt fund/ændring (skriver kun
  til `apv_forslag`), `/mine-forslag`, admin-indbakke `/admin/forslag` (diff +
  godkend/afvis via RPC). `..._apv_fund_afventende_forslag.sql` — boolean-tjek, så
  alle kan se et diskret "afventer"-banner uden at se forslagets indhold.

**Fase 1 — migrationer kørt i det delte Supabase-projekt** (`supabase/migrations/`):
- `..._apv_skema.sql` — 9 tabeller (`apv_omraader/kemikalier/maskiner/paabud/fund/
  eftersyn/krv/handlinger/forslag`) + hjælpefunktioner (`apv_er_admin`,
  `apv_risikoniveau`, `apv_touch_updated_at`, `apv_forslag_set_navn`) + triggers.
- `..._apv_views.sql` — `apv_fund_beriget` (risikoniveau) + `apv_maskiner_beriget`
  (seneste/næste eftersyn), begge `security_invoker`.
- `..._apv_rls.sql` — GRANTs + 26 RLS-policies (fail-closed; admin-only writes;
  ingen hard delete).
- `..._apv_forslag_funktioner.sql` — `apv_godkend_forslag()` (whitelist, ingen
  dynamic SQL, `ret` nulstiller nullable felter via JSONB-key-presence) +
  `apv_afvis_forslag()`.
- **Manuelt krav:** en bruger skal have `rolle='admin'` + `aktiv=true` i `profiler`
  for at kunne godkende/afvise.

### Fase 0 — scaffold

Opsat:
- Vite 8 + React 19 + TypeScript (strict, `noUnusedLocals`/`noUnusedParameters`).
- Tailwind 4 via `@tailwindcss/vite`. Design-tokens i `src/index.css`
  (identisk `@theme`-blok med de øvrige SMU-apps).
- `src/lib/supabase.ts` — delt singleton mod SAMME Supabase-projekt.
- `src/context/AuthContext.tsx` — session + `profiler`-opslag.
- `src/pages/Login.tsx` + `ResetPassword.tsx` — SMU-login med glemt-adgangskode.
- `src/components/Layout.tsx` (login-gate) + `Header.tsx` (nav-shell).
- `src/pages/Forside.tsx` — placeholder (ikke det rigtige dashboard).
- Routing i `src/App.tsx`. `netlify.toml` (+ Node 20-pin), `.nvmrc`, `.env.example`,
  `public/_redirects`, favicon.

## Kendte afvigelser fra standarden

- **Roller (bevist behov):** APV bruger medarbejder/admin-adskillelse med
  **forslag → admin-godkendelse** (som Wiki). Afviger fra standardens udgangspunkt
  "ingen roller". Håndhæves i både RLS og frontend.
- **Ingen tests endnu** (Vitest ikke opsat i scaffold-fasen — kan tilføjes).
- Node 25 lokalt; builds pinnes til **Node 20** (`.nvmrc` + `netlify.toml`).

## Datamodel (jf. DOMAIN_MODEL.md)

Autoritative, typed `apv_`-tabeller: `apv_fund`, `apv_handlinger`, `apv_omraader`,
`apv_kemikalier`, `apv_krv`, `apv_maskiner`, `apv_eftersyn`, `apv_paabud` +
`apv_forslag` (generisk forslags-indbakke, anvendt via whitelist).
Alle med `slettet` (soft-delete) + audit (`created_by`/`updated_by` = `auth.uid()`)
+ RLS `to authenticated`. Beregnede værdier (risikoscore/-niveau, seneste/næste
eftersyn) indtastes aldrig.

**Additive felter (opslags-fase):** `apv_kemikalier` fik `forbrug`,
`lagermaengde`, `arbejdsprocedure`; `apv_maskiner` fik `note` (fra Excel).
Forslags-whitelisten (`apv_godkend_forslag`) er **ikke** udvidet med disse endnu —
gøres først når kemikalie-/maskine-redigering bygges som workflow.

## Ved reskin / design-arbejde — LÆS FØRST
1. **Læs `SMU_DESIGN_SYSTEM.md` FØR du ændrer styling.**
2. Brug CSS-variabler + hjælpeklasser (`.smu-card`, `.smu-badge*`, `.smu-btn-*`,
   `.smu-input`) — **aldrig rå hex i komponenter**.
3. Hold `@theme`-blokken i `src/index.css` identisk med `smu-os-v2`.
4. "Aldrig bryd": ingen gradients, ingen emojis (Lucide-ikoner), rød kun til fejl,
   font-weight ≥ 600 synligt, border-radius ≥ 8px (14px på kort).
5. Login, tomme states og fejlskærme skal føles som SMU.

## Kommandoer
`npm run dev` · `npm run build` · `npm run lint` · `npm run preview`.
Kør tsc/build/lint efter ændringer; skriv hvad der er ændret + hvad der skal
testes manuelt. **Alt på dansk:** kode, kommentarer, felter, UI-tekst.
