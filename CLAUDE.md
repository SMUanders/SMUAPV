# SMU APV — satellit-app i SMU/Signmeup-universet

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

## Status — Fase 0 (scaffold) færdig

Teknisk fundament er på plads. **Ingen** database, seed eller APV-features endnu.

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
  "ingen roller". Håndhæves i både RLS og frontend, når databasen bygges.
- **Ingen tests endnu** (Vitest ikke opsat i scaffold-fasen — kan tilføjes).
- Node 25 lokalt; builds pinnes til **Node 20** (`.nvmrc` + `netlify.toml`).

## Datamodel (jf. DOMAIN_MODEL.md — bygges i senere faser)

Autoritative, typed `apv_`-tabeller: `apv_fund`, `apv_handlinger`, `apv_omraader`,
`apv_kemikalier`, `apv_krv`, `apv_maskiner`, `apv_eftersyn`, `apv_paabud` +
`apv_forslag` (generisk forslags-indbakke, anvendt via whitelist).
Alle med `slettet` (soft-delete) + audit (`created_by`/`updated_by` = `auth.uid()`)
+ RLS `to authenticated`. Beregnede værdier (risikoscore/-niveau, seneste/næste
eftersyn) indtastes aldrig.

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
