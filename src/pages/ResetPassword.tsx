import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Landingsside for reset-link fra Login. Supabase opretter en midlertidig session
// ud fra linket (PASSWORD_RECOVERY-event), hvorefter brugeren vælger ny adgangskode.
type Tilstand = 'klar' | 'gemmer' | 'gemt' | 'ugyldig'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [tilstand, setTilstand] = useState<Tilstand>('klar')
  const [fejl, setFejl] = useState('')

  useEffect(() => {
    // Har vi en gyldig recovery-session? Ellers er linket udløbet/ugyldigt.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setTilstand('ugyldig')
    })
  }, [])

  async function handleGem(e: React.FormEvent) {
    e.preventDefault()
    setFejl('')
    if (password.length < 8) { setFejl('Adgangskoden skal være mindst 8 tegn.'); return }
    if (password !== password2) { setFejl('De to adgangskoder er ikke ens.'); return }
    setTilstand('gemmer')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setFejl(`Kunne ikke gemme: ${error.message}`)
      setTilstand('klar')
    } else {
      setTilstand('gemt')
      setTimeout(() => navigate('/'), 1500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-navy">SMU APV</h1>
          <p className="smu-meta text-[13px] mt-1">Vælg ny adgangskode</p>
        </div>

        <div className="smu-card p-7">
          {tilstand === 'ugyldig' && (
            <div className="space-y-4">
              <p className="smu-error">Linket er udløbet eller ugyldigt. Bed om et nyt reset-link.</p>
              <button onClick={() => navigate('/login')} className="smu-btn-secondary w-full text-center">
                Tilbage til login
              </button>
            </div>
          )}

          {tilstand === 'gemt' && (
            <div className="rounded-lg p-4 bg-teal-soft">
              <p className="text-[13px] font-bold text-teal-deep mb-1">Adgangskode opdateret</p>
              <p className="text-[12px] font-semibold text-teal-deep">Du bliver logget ind…</p>
            </div>
          )}

          {(tilstand === 'klar' || tilstand === 'gemmer') && (
            <form onSubmit={handleGem} className="space-y-4">
              <div>
                <span className="smu-label">Ny adgangskode</span>
                <input type="password" required autoComplete="new-password" autoFocus
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="smu-input" placeholder="Mindst 8 tegn" />
              </div>
              <div>
                <span className="smu-label">Gentag adgangskode</span>
                <input type="password" required autoComplete="new-password"
                  value={password2} onChange={e => setPassword2(e.target.value)}
                  className="smu-input" placeholder="••••••••" />
              </div>
              {fejl && <p className="smu-error">{fejl}</p>}
              <button type="submit" disabled={tilstand === 'gemmer'} className="smu-btn-primary w-full py-2.5">
                {tilstand === 'gemmer' ? 'Gemmer…' : 'Gem ny adgangskode'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
