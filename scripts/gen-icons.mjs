// Genererer PWA/favicon-PNG'er fra scripts/icon-source.svg → public/.
// Kør: node scripts/gen-icons.mjs  (kræver devDependency 'sharp').
// Reproducerbart — commit output-PNG'erne.
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const her = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(join(her, 'icon-source.svg'))
const ud = join(her, '..', 'public')

const opgaver = [
  { fil: 'favicon-32.png', str: 32 },
  { fil: 'apple-touch-icon.png', str: 180 },
  { fil: 'pwa-192x192.png', str: 192 },
  { fil: 'pwa-512x512.png', str: 512 },
  { fil: 'pwa-maskable-512x512.png', str: 512 },
]

for (const { fil, str } of opgaver) {
  await sharp(svg, { density: 512 })
    .resize(str, str, { fit: 'contain', background: '#213746' })
    .png()
    .toFile(join(ud, fil))
  console.log('skrev', fil, `${str}x${str}`)
}
