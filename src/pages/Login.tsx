import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

type Tilstand = 'login' | 'glemt' | 'sender_glemt' | 'glemt_sendt'

export default function Login() {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tilstand, setTilstand] = useState<Tilstand>('login')
  const [fejl, setFejl] = useState('')
  const [loggerInd, setLoggerInd] = useState(false)

  if (loading) return null
  if (user) return <Navigate to="/" replace />

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setFejl('')
    setLoggerInd(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setFejl('Forkert email eller adgangskode.')
      setLoggerInd(false)
    }
  }

  async function handleSendReset(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setFejl('Indtast din email først.'); return }
    setFejl(''); setTilstand('sender_glemt')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setFejl(`Kunne ikke sende reset-mail: ${error.message}`)
      setTilstand('glemt')
    } else {
      setTilstand('glemt_sendt')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-navy">SMU APV</h1>
          <p className="smu-meta text-[13px] mt-1">Signmeups arbejdsmiljøsystem</p>
        </div>

        <div className="smu-card p-7">
          <h2 className="text-[17px] font-extrabold text-navy tracking-[-0.01em] mb-5">
            {tilstand === 'login' ? 'Log ind' : tilstand === 'glemt_sendt' ? 'Tjek din email' : 'Glemt adgangskode'}
          </h2>

          {tilstand === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Felt label="Email">
                <input type="email" required autoComplete="email" autoFocus
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="smu-input" placeholder="navn@signmeup.dk" />
              </Felt>
              <Felt label="Adgangskode">
                <input type="password" required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="smu-input" placeholder="••••••••" />
              </Felt>
              {fejl && <p className="smu-error">{fejl}</p>}
              <button type="submit" disabled={loggerInd} className="smu-btn-primary w-full py-2.5">
                {loggerInd ? 'Logger ind…' : 'Log ind'}
              </button>
              <div className="text-center pt-1">
                <button type="button" onClick={() => { setTilstand('glemt'); setFejl('') }}
                  className="smu-link text-[12px]">
                  Glemt adgangskode?
                </button>
              </div>
            </form>
          )}

          {(tilstand === 'glemt' || tilstand === 'sender_glemt') && (
            <form onSubmit={handleSendReset} className="space-y-4">
              <p className="smu-meta text-[13px]">
                Indtast din email, så sender vi dig et link til at vælge en ny adgangskode.
              </p>
              <Felt label="Email">
                <input type="email" required autoComplete="email" autoFocus
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="smu-input" placeholder="navn@signmeup.dk" />
              </Felt>
              {fejl && <p className="smu-error">{fejl}</p>}
              <button type="submit" disabled={tilstand === 'sender_glemt'} className="smu-btn-primary w-full py-2.5">
                {tilstand === 'sender_glemt' ? 'Sender…' : 'Send reset-link'}
              </button>
              <div className="text-center pt-1">
                <button type="button" onClick={() => { setTilstand('login'); setFejl('') }}
                  className="smu-link text-[12px]">
                  Tilbage til login
                </button>
              </div>
            </form>
          )}

          {tilstand === 'glemt_sendt' && (
            <div className="space-y-4">
              <div className="rounded-lg p-4 bg-teal-soft">
                <p className="text-[13px] font-bold text-teal-deep mb-1">Reset-link sendt</p>
                <p className="text-[12px] font-semibold text-teal-deep">
                  Vi har sendt et link til <span className="font-extrabold">{email}</span>. Tjek også din spam-mappe. Linket er gyldigt i en time.
                </p>
              </div>
              <button type="button" onClick={() => { setTilstand('login'); setFejl('') }} className="smu-btn-secondary w-full text-center">
                Tilbage til login
              </button>
            </div>
          )}
        </div>

        <p className="smu-meta text-[11px] text-center mt-6">
          Deler login med SMU OS og SMU Wiki. Ingen selvbetjent oprettelse — kontakt en administrator.
        </p>
      </div>
    </div>
  )
}

function Felt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="smu-label">{label}</span>
      {children}
    </div>
  )
}
