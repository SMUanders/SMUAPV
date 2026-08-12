import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  // Respektér en tildelt PORT (fx fra preview-harness). Ellers Vites standard.
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
})
