import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Gavel } from 'lucide-react'
import { hentPaabud } from '../lib/apvApi'
import type { Paabud } from '../types/apv'
import { PAABUD_TYPE_LABEL, PAABUD_STATUS_LABEL, paabudStatusBadge } from '../types/apv'
import { dkDato } from '../lib/format'

export default function PaabudListe() {
  const [paabud, setPaabud] = useState<Paabud[]>([])
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')

  useEffect(() => {
    hentPaabud()
      .then(setPaabud)
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente påbud.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <p className="smu-eyebrow">Opslag</p>
        <h1 className="smu-page-title mt-1">Påbud</h1>
        <p className="smu-meta text-[13px] mt-2">Afgørelser og påbud fra myndighed.</p>
      </div>

      {fejl && <div className="smu-notice smu-notice-warn"><AlertTriangle size={15} />{fejl}</div>}
      {loading && <p className="smu-meta text-sm">Indlæser…</p>}
      {!loading && !fejl && paabud.length === 0 && (
        <div className="smu-card p-8 text-center"><p className="smu-meta text-[13px]">Ingen påbud registreret.</p></div>
      )}

      <div className="space-y-2">
        {paabud.map(p => (
          <Link key={p.id} to={`/paabud/${p.id}`} className="smu-card smu-list-card block p-4 no-underline">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <Gavel size={18} className="text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[15px] font-extrabold text-navy">{p.titel}</p>
                  <p className="smu-meta text-[12px] mt-0.5">
                    {PAABUD_TYPE_LABEL[p.type]} · {p.myndighed}
                    {p.dato_modtaget && <> · modtaget {dkDato(p.dato_modtaget)}</>}
                  </p>
                  {p.status !== 'afsluttet' && (!p.frist || !p.ansvarlig_id) && (
                    <p className="text-[12px] mt-0.5 font-bold text-orange-deep">
                      {[!p.ansvarlig_id && 'ansvarlig', !p.frist && 'frist'].filter(Boolean).join(' + ')} mangler
                    </p>
                  )}
                </div>
              </div>
              <span className={paabudStatusBadge(p.status)}>{PAABUD_STATUS_LABEL[p.status]}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
