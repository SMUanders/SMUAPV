import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

// Menneskelig PRODUKTVERSION — eneste sandhedskilde er package.json "version".
// Indlejres som __APP_PRODUCT_VERSION__ og vises diskret i UI. Adskilt fra et
// teknisk build-id, som denne app ikke har (se src/lib/version.ts).
const PRODUCT_VERSION = JSON.parse(readFileSync('./package.json', 'utf-8')).version as string

export default defineConfig({
  define: {
    __APP_PRODUCT_VERSION__: JSON.stringify(PRODUCT_VERSION),
  },
  plugins: [
    tailwindcss(),
    react(),
  ],
  // Respektér en tildelt PORT (fx fra preview-harness). Ellers Vites standard.
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
})
