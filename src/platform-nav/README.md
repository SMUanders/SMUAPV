# SMU Platform-nav (canonical)

Fælles platform-navigation for SMU Platform. **Model D:** dette er kilde-of-truth; filerne **kopieres uændret**
ind i hver app der skal have app-skifteren (ingen npm-pakke/monorepo). Kanonisk placering:
`smu-hub/src/platform-nav/`.

## Indhold (ejer KUN platform-navigation — ikke app-domæne-UI)
- `platformApps.ts` — app-katalog keyed på app-key (os/tid/apv/wiki/color/source) + `HUB_APP`. Synlighed kommer
  altid fra `app_adgange` (live), aldrig fra metadata.
- `AppIcon.tsx` — officielt app-ikon kant-til-kant (rounded clip, ingen ekstra navy-tile).
- `useAllowedApps.ts` — `usePlatformApps()` (hele kataloget med brugerens tilstand) og `useAllowedApps()`
  (kun apps brugeren må åbne). Læser `app_adgange` via den injicerede Supabase-klient (ingen bypass).
- `AppSwitcher.tsx` — diskret dropdown til apps' eksisterende topbar (version-agnostisk, inline SVG-gitter,
  `<a href>`-navigation, framework-agnostiske inline-styles).
- `platformStorage.ts` — miljøbevidst Supabase-session-storage (delt cookie på `*.smu.signmeup.dk`, ellers localStorage).

## To forskellige overflader — bevidst forskelligt indhold

| | **Hub** (platformoversigt) | **AppSwitcher** (daglig navigation) |
|---|---|---|
| Hook | `usePlatformApps()` | `useAllowedApps()` |
| Viser | hele SMU-universet | Hub + aktuel app + brugerens øvrige live-apps |
| Apps uden adgang | vises med "Ingen adgang" | vises **ikke** |
| Apps på vej | vises med "På vej" | vises **ikke** |

Hub er platformens kort: en medarbejder skal kunne se, at fx SMU Source findes, uden at kunne åbne den.
AppSwitcher er et arbejdsværktøj: den må kun indeholde ting, brugeren rent faktisk kan hoppe til.

**Tilstande** (`AppTilstand` i `useAllowedApps.ts`):
- `tilgaengelig` — appen er live **og** brugeren har aktiv `app_adgang` → kortet er et link.
- `ingen_adgang` — appen er live, men brugeren mangler adgang → kortet vises roligt uden href.
  Det må **ikke** ligne en teknisk fejl: grå mærkat, ingen rød, ingen fejlikon.
- `paa_vej` — kendt platform-app der endnu ikke er live → dæmpet kort, ingen URL opfindes.

## URL-disciplin
`url` er appens **verificerede live-adresse** — det eneste Hub/AppSwitcher linker til.
`maalUrl` er platformens **godkendte målmodel** (`<app>.smu.signmeup.dk`) og er dokumentation, ikke live-sandhed.

Hub (`smu.signmeup.dk`) og OS (`os.smu.signmeup.dk`) er cutover og live-verificeret. De øvrige apps kører
fortsat på deres Netlify-adresse. Den delte cookie-session (SSO) virker **kun** på `*.smu.signmeup.dk`, så et
hop fra Hub til en `netlify.app`-adresse kan kræve nyt login, indtil den app er cutover.

Tilføj aldrig en app til kataloget på et gæt — hverken app-key, URL, ikon eller status skal antages.

## Multi-app arbejde
Navigation sker med almindelige `<a href>`, ikke programmatisk redirect. Brugeren bestemmer selv, om en app
åbnes i samme eller ny fane (cmd/ctrl-klik, midterklik). Tving ikke alt ind i én fane — en medarbejder skal
kunne have OS, Tid og Color åbne samtidig.

## Cross-app handoff — godkendt princip, endnu ikke bygget
En app **må** deep-linke til en anden app med relevant kontekst, når modtagerappen ejer arbejdsopgaven
(fx OS Sag → "Åbn i Color", OS Sag → "Registrér tid"). Kontrakten:

1. **Modtageren ejer opgaven.** Afsenderen starter et flow; den ejende app validerer og udfører.
2. **Konteksten er en stabil reference** (fx `sag_id`/SMU-nummer) — aldrig kopieret domænedata.
3. **Adgang afgøres hos modtageren.** Et handoff-link er ikke en adgangstildeling; RLS og `app_adgange`
   håndhæves som altid i modtagerappen.
4. **Handoff må åbne i ny fane**, når det hjælper brugeren med at bevare sin primære arbejdskontekst.
5. **Ingen skjult skrivning på tværs af domæner.** Et handoff må ikke ændre data i modtagerens domæne
   uden brugerens eksplicitte handling dér.

Konkrete handoffs (OS→Color, OS→Tid) er **ikke** implementeret og kræver produktbeslutning først.

## Sådan bruges det i en app
1. Kopiér HELE `platform-nav/`-mappen ind i appens `src/platform-nav/`.
2. Kopiér de officielle app-ikoner ind i appens `public/icons/apps/` (samme filer som Hub) — metadata-`icon`-stier
   er relative til den hostende apps origin.
3. Supabase-klient: override **kun** `storage: platformAuthStorage()` (+ evt. `persistSession:true`,
   `autoRefreshToken:true`). **Behold appens eksisterende `flowType`** — skift IKKE til pkce hvis appen har et
   implicit-baseret reset-password-flow (fx OS's `#access_token`-parsing); `flowType` påvirker ikke session-deling.
   På `*.netlify.app`/localhost falder storage tilbage til localStorage → uændret nuværende adfærd.
4. Placér `<AppSwitcher supabase={supabase} currentAppKey="<denne-apps-key>" />` diskret i appens topbar.
5. Sørg for en synlig vej tilbage til Hub (skifteren indeholder altid Hub).

## Opdatering
Ret canonical i `smu-hub/src/platform-nav/` og kopiér på ny ind i apps (som design-systemet). Ingen registry/build-infra.
