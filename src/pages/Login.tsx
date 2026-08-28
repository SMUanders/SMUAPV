import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const HUB_URL = 'https://smu.signmeup.dk'

/**
 * SMU APV har ikke længere sit eget login.
 *
 * SMU Platform har ét fælles login på SMU Hub. Denne side tilbød tidligere
 * email + adgangskode direkte, hvilket var en parallel loginvej: en medarbejder
 * kunne blive på det fælles password og aldrig komme over på sit personlige.
 *
 * Supabase Auth er uændret identitetsejer. Der er ikke tilføjet ny auth; der er
 * kun fjernet en parallel indgang. Sessionen deles via platform-cookien på
 * `.smu.signmeup.dk`, så login i Hub åbner appen uden nyt login.
 *
 * Adgangskontrollen er uændret: `app_adgange`, `app_roller` og RLS afgør fortsat
 * alt. Et Hub-login giver ikke i sig selv adgang til denne app.
 */
export default function Login() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const retur = (location.state as { from?: string } | null)?.from ?? '/'
  if (loading) return null
  if (user) return <Navigate to={retur} replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="smu-card w-full max-w-[380px] p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/favicon.svg" alt="" className="mb-3 h-14 w-14 object-contain" />
          <h1 className="text-[19px] font-extrabold text-navy">SMU APV</h1>
          <p className="mt-1 text-sm font-semibold text-text-muted">Arbejdspladsvurdering og arbejdsmiljø</p>
        </div>

        <h2 className="text-[15px] font-extrabold text-navy">Log ind på SMU Hub</h2>
        <p className="mt-2 text-sm text-text-muted">
          SMU Platform har ét fælles login. Log ind på Hub med dit korte brugernavn og din
          personlige adgangskode — så åbner SMU APV uden at du skal logge ind igen.
        </p>

        <a
          href={HUB_URL}
          className="smu-btn-primary mt-5 block text-center"
          style={{ textDecoration: 'none' }}
        >
          Gå til SMU Hub
        </a>

        <p className="mt-4 text-xs font-semibold text-text-muted">
          Mangler du adgangskode, så bed Anders om et engangslink.
        </p>
      </div>
    </div>
  )
}
