import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, AlertTriangle, Wrench } from 'lucide-react'
import { hentMaskiner } from '../lib/apvApi'
import type { Maskine } from '../types/apv'
import { MASKINE_STATUS_LABEL, maskineStatusBadge } from '../types/apv'
import { dkDato } from '../lib/format'

export default function MaskineListe() {
  const [maskiner, setMaskiner] = useState<Maskine[]>([])
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')
  const [sog, setSog] = useState('')

  useEffect(() => {
    hentMaskiner()
      .then(setMaskiner)
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
          <Link key={m.id} to={`/maskiner/${m.id}`} className="smu-card smu-list-card block p-4 no-underline">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <Wrench size={18} className="text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[15px] font-extrabold text-navy">{m.navn}</p>
                  <p className="smu-meta text-[12px] mt-0.5">{m.fabrikat_model ?? m.type ?? '—'}</p>
                  <p className="smu-meta text-[12px] mt-0.5">{m.serienr}</p>
                  {m.naeste_eftersyn && (
                    <p className="smu-meta text-[12px] mt-1">Næste eftersyn: {dkDato(m.naeste_eftersyn)}</p>
                  )}
                </div>
              </div>
              <span className={maskineStatusBadge(m.status)}>{MASKINE_STATUS_LABEL[m.status]}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
