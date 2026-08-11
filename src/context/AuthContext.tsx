import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profil } from '../types/apv'

interface AuthContextType {
  user: User | null
  profil: Profil | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profil: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [loading, setLoading] = useState(true)

  // Profil hentes fra den DELTE profiler-tabel (samme som SMU OS / Wiki).
  async function hentProfil(userId: string) {
    const { data } = await supabase
      .from('profiler')
      .select('id, fuldt_navn, rolle, aktiv')
      .eq('id', userId)
      .single()
    setProfil((data as Profil) ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        hentProfil(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        hentProfil(session.user.id)
      } else {
        setProfil(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profil, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
