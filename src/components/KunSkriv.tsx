import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * Rute-guard for skrivehandlinger. En observatør har læseadgang (read-only) og
 * kan ikke gemme — databasen afviser det. I stedet for en formular, der fejler
 * ved gem, vises en tydelig besked. Gælder også direkte links og QR-koder.
 */
export default function KunSkriv({ children }: { children: React.ReactNode }) {
  const { appSkriv } = useAuth()
  if (appSkriv) return <>{children}</>
  return (
    <div className="max-w-md mx-auto smu-card p-7 text-center space-y-3">
      <Eye size={22} className="mx-auto text-text-muted" />
      <h1 className="smu-h1">Du har læseadgang</h1>
      <p className="smu-meta">
        Din rolle i SMU APV er read-only. Du kan søge og læse, men ikke oprette eller ændre.
        Skal du kunne det, tildeles rollen i SMU Hub under Medarbejdere.
      </p>
      <Link to="/" className="smu-btn-secondary inline-block">Til forsiden</Link>
    </div>
  )
}
