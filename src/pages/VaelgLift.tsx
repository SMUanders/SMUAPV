import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ClipboardCheck, ChevronRight } from 'lucide-react'
import { hentMaskiner } from '../lib/apvApi'
import type { Maskine } from '../types/apv'

export default function VaelgLift() {
  const [maskiner, setMaskiner] = useState<Maskine[]>([])
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')

  useEffect(() => {
    hentMaskiner()
      .then(setMaskiner)
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente lifte.'))
      .finally(() => setLoading(false))
  }, [])

  // Vis sakselifte hvis typen kendes; ellers alle maskiner.
  const lifte = useMemo(() => {
    const kunLifte = maskiner.filter(m => (m.type ?? '').toLowerCase().includes('lift'))
    return kunLifte.length > 0 ? kunLifte : maskiner
  }, [maskiner])

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

      <div className="space-y-2">
        {lifte.map(m => (
          <Link key={m.id} to={`/maskiner/${m.id}/dagligt-tjek`}
            className="smu-card smu-list-card block p-4 no-underline">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <ClipboardCheck size={18} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[15px] font-extrabold text-navy">{m.navn}</p>
                  <p className="smu-meta text-[12px] mt-0.5">{m.fabrikat_model ?? m.type ?? '—'}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-text-muted shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
