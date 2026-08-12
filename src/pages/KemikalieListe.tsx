import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, AlertTriangle, FlaskConical } from 'lucide-react'
import { hentKemikalier } from '../lib/apvApi'
import type { Kemikalie } from '../types/apv'

export default function KemikalieListe() {
  const [kemikalier, setKemikalier] = useState<Kemikalie[]>([])
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')
  const [sog, setSog] = useState('')

  useEffect(() => {
    hentKemikalier()
      .then(setKemikalier)
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente kemikalier.'))
      .finally(() => setLoading(false))
  }, [])

  const synlige = useMemo(() => {
    const q = sog.trim().toLowerCase()
    if (!q) return kemikalier
    return kemikalier.filter(k =>
      k.produktnavn.toLowerCase().includes(q)
      || (k.leverandoer ?? '').toLowerCase().includes(q)
      || (k.anvendelse ?? '').toLowerCase().includes(q)
      || k.h_saetninger.some(h => h.toLowerCase().includes(q))
      || (k.ppe ?? '').toLowerCase().includes(q))
  }, [kemikalier, sog])

  return (
    <div className="space-y-5">
      <div>
        <p className="smu-eyebrow">Opslag</p>
        <h1 className="smu-page-title mt-1">Kemikalier</h1>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input className="smu-input pl-9" placeholder="Søg i produkt, leverandør, H-sætning, PPE eller anvendelse"
          value={sog} onChange={e => setSog(e.target.value)} />
      </div>

      {fejl && <div className="smu-notice smu-notice-warn"><AlertTriangle size={15} />{fejl}</div>}
      {loading && <p className="smu-meta text-sm">Indlæser…</p>}
      {!loading && !fejl && synlige.length === 0 && (
        <div className="smu-card p-8 text-center">
          <p className="smu-meta text-[13px]">Ingen kemikalier matcher.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {synlige.map(k => (
          <Link key={k.id} to={`/kemikalier/${k.id}`} className="smu-card smu-list-card block p-4 no-underline">
            <div className="flex items-start gap-3">
              <FlaskConical size={18} className="text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[15px] font-extrabold text-navy">{k.produktnavn}</p>
                <p className="smu-meta text-[12px] mt-0.5">{k.leverandoer ?? '—'}</p>
                {k.anvendelse && <p className="text-[12px] font-semibold text-text-muted mt-1.5 line-clamp-2">{k.anvendelse}</p>}
                {k.h_saetninger.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {k.h_saetninger.slice(0, 4).map((h, i) => (
                      <span key={i} className="smu-badge smu-badge-grey !text-[10px]">{h.split(':')[0]}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
