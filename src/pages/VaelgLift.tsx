import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { hentMaskiner, hentSenesteTjekPrMaskine, type SenesteTjek } from '../lib/apvApi'
import type { Maskine } from '../types/apv'
import LiftKort from '../components/LiftKort'

// Sorterings-rang: fejl først, så ikke-tjekket, så godkendt.
function rang(t: SenesteTjek | null): number {
  if (t?.status === 'fejl') return 0
  if (!t) return 1
  return 2
}

export default function VaelgLift() {
  const [maskiner, setMaskiner] = useState<Maskine[]>([])
  const [seneste, setSeneste] = useState<Record<string, SenesteTjek>>({})
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')

  useEffect(() => {
    Promise.all([hentMaskiner(), hentSenesteTjekPrMaskine()])
      .then(([m, s]) => { setMaskiner(m); setSeneste(s) })
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente lifte.'))
      .finally(() => setLoading(false))
  }, [])

  const lifte = useMemo(() => {
    const kunLifte = maskiner.filter(m => (m.type ?? '').toLowerCase().includes('lift'))
    const liste = kunLifte.length > 0 ? kunLifte : maskiner
    return [...liste].sort((a, b) => {
      const r = rang(seneste[a.id] ?? null) - rang(seneste[b.id] ?? null)
      return r !== 0 ? r : a.navn.localeCompare(b.navn, 'da')
    })
  }, [maskiner, seneste])

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      <div>
        <p className="smu-eyebrow">Dagligt tjek</p>
        <h1 className="smu-page-title mt-1">Dagligt lift-tjek</h1>
        <p className="smu-meta text-[13px] mt-2">Vælg den lift, du skal bruge, og gennemfør før-ibrug-kontrollen.</p>
      </div>

      {fejl && <div className="smu-notice smu-notice-warn"><AlertTriangle size={15} />{fejl}</div>}
      {loading && <p className="smu-meta text-sm">Indlæser…</p>}
      {!loading && !fejl && lifte.length === 0 && (
        <div className="smu-card p-8 text-center"><p className="smu-meta text-[13px]">Ingen lifte registreret.</p></div>
      )}

      <div className="space-y-3">
        {lifte.map(m => (
          <LiftKort key={m.id} maskine={m} senesteTjek={seneste[m.id] ?? null} variant="tjek" />
        ))}
      </div>
    </div>
  )
}
