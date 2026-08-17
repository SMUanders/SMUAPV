import { useEffect, useMemo, useState } from 'react'
import { Search, AlertTriangle } from 'lucide-react'
import { hentMaskiner, hentSenesteTjekPrMaskine, type SenesteTjek } from '../lib/apvApi'
import type { Maskine } from '../types/apv'
import LiftKort from '../components/LiftKort'

export default function MaskineListe() {
  const [maskiner, setMaskiner] = useState<Maskine[]>([])
  const [seneste, setSeneste] = useState<Record<string, SenesteTjek>>({})
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')
  const [sog, setSog] = useState('')

  useEffect(() => {
    Promise.all([hentMaskiner(), hentSenesteTjekPrMaskine()])
      .then(([m, s]) => { setMaskiner(m); setSeneste(s) })
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente maskiner.'))
      .finally(() => setLoading(false))
  }, [])

  const synlige = useMemo(() => {
    const q = sog.trim().toLowerCase()
    if (!q) return maskiner
    return maskiner.filter(m =>
      m.navn.toLowerCase().includes(q)
      || (m.serienr ?? '').toLowerCase().includes(q)
      || (m.fabrikat_model ?? '').toLowerCase().includes(q)
      || (m.type ?? '').toLowerCase().includes(q))
  }, [maskiner, sog])

  return (
    <div className="space-y-5">
      <div>
        <p className="smu-eyebrow">Opslag</p>
        <h1 className="smu-page-title mt-1">Maskiner</h1>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input className="smu-input pl-9" placeholder="Søg i navn, serienummer, fabrikat/model eller type"
          value={sog} onChange={e => setSog(e.target.value)} />
      </div>

      {fejl && <div className="smu-notice smu-notice-warn"><AlertTriangle size={15} />{fejl}</div>}
      {loading && <p className="smu-meta text-sm">Indlæser…</p>}
      {!loading && !fejl && synlige.length === 0 && (
        <div className="smu-card p-8 text-center"><p className="smu-meta text-[13px]">Ingen maskiner matcher.</p></div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {synlige.map(m => (
          <LiftKort key={m.id} maskine={m} senesteTjek={seneste[m.id] ?? null} variant="register" />
        ))}
      </div>
    </div>
  )
}
