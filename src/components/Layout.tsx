import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Header from './Header'

const HUB_URL = 'https://smu.signmeup.dk'

// Login-gate + adgangs-gate. Et platform-login giver ikke i sig selv adgang til
// SMU APV — det afgør app_adgange (har_app_adgang('apv')), som Hub tildeler.
export default function Layout() {
  const { user, profil, loading, appAdgang, appAdgangFejl } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="smu-meta text-sm">Indlæser…</p>
      </div>
    )
  }

  if (!user) {
    // Husk den ønskede side (fx QR → /maskiner/:id/dagligt-tjek) og returnér efter login.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (!appAdgang) {
    return <IngenAdgang deaktiveret={profil?.aktiv === false} fejl={appAdgangFejl} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Header />
      <main className="flex-1 w-full max-w-[1100px] mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}

function IngenAdgang({ deaktiveret, fejl }: { deaktiveret: boolean; fejl: string | null }) {
  async function handleLogout() {
    await supabase.auth.signOut()
  }
  const besked = fejl
    ? 'Din adgang kunne ikke bekræftes lige nu. Prøv igen om et øjeblik.'
    : deaktiveret
      ? 'Din konto er deaktiveret. Kontakt en administrator.'
      : 'Du er logget ind, men din bruger har ikke adgang til SMU APV. Adgang tildeles i SMU Hub under Medarbejdere.'
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-navy mb-2">SMU APV</h1>
        <div className="smu-card p-7 space-y-4">
          <p className="smu-error">{besked}</p>
          {fejl ? (
            <button onClick={() => window.location.reload()} className="smu-btn-primary w-full text-center">
              Prøv igen
            </button>
          ) : !deaktiveret && (
            <a href={HUB_URL} className="smu-btn-primary w-full text-center block">Gå til SMU Hub</a>
          )}
          <button onClick={handleLogout} className="smu-btn-secondary w-full text-center">
            Log ud
          </button>
        </div>
      </div>
    </div>
  )
}
