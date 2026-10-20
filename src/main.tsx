import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PlatformUpdateBoundary } from './platform-update/PlatformUpdateBoundary'
import { UpdateBanner } from './platform-update/UpdateBanner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Fælles update-notifikation (platform-update): banner ved ny version, recovery-kort ved lazy-fejl. */}
    <PlatformUpdateBoundary>
      <App />
    </PlatformUpdateBoundary>
    <UpdateBanner />
  </StrictMode>,
)
