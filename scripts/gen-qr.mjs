// Genererer QR-koder + printklart mærkat-layout til de 6 sakselifte.
// Kør: node scripts/gen-qr.mjs   (kræver devDependency 'qrcode')
// QR peger på liftens "Kontrol før brug"-skema på den live base-URL.
// Maskine-id'er = de faste UUID'er fra apv_maskiner (seed).
import QRCode from 'qrcode'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const BASE = 'https://smuapv.netlify.app'
const NAVY = '#213746'

const LIFTE = [
  { navn: 'INA',     fil: 'ina',     id: 'a0000000-0000-4000-8000-0000000000d1' },
  { navn: 'LISSY',   fil: 'lissy',   id: 'a0000000-0000-4000-8000-0000000000d2' },
  { navn: 'ANDREAS', fil: 'andreas', id: 'a0000000-0000-4000-8000-0000000000d3' },
  { navn: 'SASCHA',  fil: 'sascha',  id: 'a0000000-0000-4000-8000-0000000000d4' },
  { navn: 'DANA',    fil: 'dana',    id: 'a0000000-0000-4000-8000-0000000000d5' },
  { navn: 'EKSTRA',  fil: 'ekstra',  id: 'a0000000-0000-4000-8000-0000000000d6' },
]

const her = dirname(fileURLToPath(import.meta.url))
const ud = join(her, '..', 'qr-koder')
mkdirSync(ud, { recursive: true })

const url = (l) => `${BASE}/maskiner/${l.id}/dagligt-tjek`

const opts = { width: 600, margin: 2, errorCorrectionLevel: 'M', color: { dark: NAVY, light: '#ffffff' } }

// 1) PNG pr. lift + data-URI til det selvstændige printark
const dataUri = {}
for (const l of LIFTE) {
  const fil = `${l.fil}-kontrol-foer-brug.png`
  await QRCode.toFile(join(ud, fil), url(l), opts)
  dataUri[l.fil] = await QRCode.toDataURL(url(l), opts)
  console.log('QR:', fil, '→', url(l))
}

// 2) Printklart mærkat-layout (HTML) — SMU-stil, ét mærkat pr. lift.
//    QR er indlejret som data-URI → arket er selvstændigt (kan printes/deles alene).
const kort = LIFTE.map(l => `
    <div class="maerkat">
      <div class="top">SMU APV</div>
      <div class="body">
        <div class="navn">${l.navn}</div>
        <div class="eyebrow">Kontrol før brug</div>
        <img class="qr" src="${dataUri[l.fil]}" alt="QR – ${l.navn}" />
        <div class="scan">Scan før liften tages i brug</div>
      </div>
    </div>`).join('')

const html = `<!doctype html>
<html lang="da"><head><meta charset="utf-8" />
<title>SMU APV – Kontrol før brug-mærkater</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; background: #f4f2ed; color: #213746;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif; font-weight: 600; padding: 16px; }
  .ark { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; max-width: 900px; margin: 0 auto; }
  .maerkat { background: #fff; border: 1px solid #e4e0d8; border-radius: 14px; overflow: hidden;
    box-shadow: 0 8px 24px rgba(33,55,70,.06); break-inside: avoid; }
  .top { background: #213746; color: #fff; font-weight: 800; letter-spacing: -.02em;
    font-size: 15px; padding: 10px 16px; }
  .body { padding: 18px 16px 20px; text-align: center; }
  .navn { font-size: 30px; font-weight: 800; letter-spacing: -.03em; color: #213746; }
  .eyebrow { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em;
    color: #2384b8; margin-top: 2px; }
  .qr { width: 200px; height: 200px; margin: 14px auto 10px; display: block; }
  .scan { font-size: 13px; font-weight: 700; color: #78909c; }
  @media print {
    body { background: #fff; padding: 0; }
    .maerkat { box-shadow: none; }
    @page { margin: 12mm; }
  }
</style></head>
<body>
  <div class="ark">${kort}
  </div>
</body></html>`

writeFileSync(join(ud, 'kontrol-foer-brug-maerkater.html'), html)
console.log('Layout: kontrol-foer-brug-maerkater.html')
