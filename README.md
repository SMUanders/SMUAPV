# SMU APV

Arbejdsmiljø-app (digital APV) i SMU/Signmeup-familien. Deler Supabase, login og
designunivers med SMU OS/Wiki. Arkitektur og status: se
[`CLAUDE.md`](CLAUDE.md), [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) og
[`DOMAIN_MODEL.md`](DOMAIN_MODEL.md).

Live: https://smuapv.netlify.app (Netlify continuous deploy fra `main`).

## Udvikling

```bash
npm install
npm run dev      # lokal dev-server
npm run build    # tsc -b && vite build
npm run lint
```

Miljøvariabler (`.env.local`, gitignored): `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
— samme delte Supabase-projekt som de øvrige SMU-apps.

## Assets

### App-ikoner (favicon/PWA)

```bash
npm run icons    # genererer public/*.png fra scripts/icon-source.svg (dev-dep: sharp)
```

### QR-koder — "Kontrol før brug" pr. lift

```bash
node scripts/gen-qr.mjs    # dev-dep: qrcode
```

Skriver til `qr-koder/`:
- én PNG pr. lift (`<lift>-kontrol-foer-brug.png`)
- `kontrol-foer-brug-maerkater.html` — printklart mærkat-ark (QR indlejret, selvstændigt)

Hver QR peger på `<base>/maskiner/:id/dagligt-tjek`. **Base-URL** og **lift-id'er**
(de faste `apv_maskiner`-UUID'er) er sat i toppen af [`scripts/gen-qr.mjs`](scripts/gen-qr.mjs)
— ret dér ved domæneskift eller nye/ændrede lifte, og kør scriptet igen.

`qr-koder/*.png` er gitignored (regenererbare); HTML-arket er committet.
