import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profil } from '../types/apv'

const APP = 'apv'

/**
 * Hvem er brugeren, og hvad må vedkommende i SMU APV?
 *
 * To begreber holdes bevidst adskilt:
 *  - `profil.rolle` er JOBFUNKTION (tegnestue, produktion …). Den er IKKE en
 *    rettighed og bruges ikke til adgangskontrol her.
 *  - Rettigheder kommer KUN fra den fælles adgangsmodel `app_adgange`/`app_roller`
 *    via `har_app_adgang`/`har_app_rolle` — de samme funktioner som RLS bruger,
 *    og dem Hub → Medarbejdere tildeler. Global super-admin er indbygget.
 *
 * Frontend-tjek er UX. Databasen er den reelle autorisation.
 */
interface AuthContextType {
  user: User | null
  profil: Profil | null
  /** `har_app_adgang('apv')`. Falsk ved fejl — fail closed. */
  appAdgang: boolean
  /** `har_app_rolle('apv', 'admin')`. */
  appAdmin: boolean
  /** Sat hvis adgangen ikke kunne afgøres (netværk/RPC-fejl). */
  appAdgangFejl: string | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profil: null,
  appAdgang: false,
  appAdmin: false,
  appAdgangFejl: null,
  loading: true,
})

interface Brugerdata {
  forBruger: string
  profil: Profil | null
  appAdgang: boolean
  appAdmin: boolean
  appAdgangFejl: string | null
}

async function hentBrugerdata(userId: string): Promise<Brugerdata> {
  // Profilen hentes fra den DELTE profiler-tabel. Appen opretter aldrig profiler.
  const [profilSvar, adgangSvar, adminSvar] = await Promise.all([
    supabase.from('profiler').select('id, fuldt_navn, rolle, aktiv').eq('id', userId).single(),
    supabase.rpc('har_app_adgang', { _app: APP }),
    supabase.rpc('har_app_rolle', { _app: APP, _min_rolle: 'admin' }),
  ])
  const fejl = adgangSvar.error ?? adminSvar.error
  return {
    forBruger: userId,
    profil: (profilSvar.data as Profil) ?? null,
    appAdgang: !fejl && adgangSvar.data === true,
    appAdmin: !fejl && adminSvar.data === true,
    appAdgangFejl: fejl ? fejl.message : null,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [sessionKlar, setSessionKlar] = useState(false)
  const [data, setData] = useState<Brugerdata | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setSessionKlar(true)
    })

    // Kun brugeren sættes her. Andre supabase-kald inde i denne callback kan
    // låse auth-klienten; hentningen sker derfor i effekten nedenfor.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const userId = user?.id ?? null

  useEffect(() => {
    if (!userId) return
    let aktuel = true
    hentBrugerdata(userId).then((d) => {
      if (aktuel) setData(d)
    })
    return () => { aktuel = false }
  }, [userId])

  // Data gælder kun for den bruger, de blev hentet til — så et brugerskift aldrig
  // viser den forrige brugers rettigheder, heller ikke et øjeblik.
  const gyldig = data && data.forBruger === userId ? data : null
  const loading = !sessionKlar || (userId !== null && gyldig === null)

  return (
    <AuthContext.Provider
      value={{
        user,
        profil: gyldig?.profil ?? null,
        appAdgang: gyldig?.appAdgang ?? false,
        appAdmin: gyldig?.appAdmin ?? false,
        appAdgangFejl: gyldig?.appAdgangFejl ?? null,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
