import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { hentMineForslag } from '../lib/apvApi'
import type { Forslag } from '../types/apv'
import {
  FORSLAG_STATUS_LABEL, FORSLAG_OPERATION_LABEL, forslagStatusBadge,
} from '../types/apv'
import { dkDatoTid } from '../lib/format'

export default function MineForslag() {
  const [forslag, setForslag] = useState<Forslag[]>([])
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')

  useEffect(() => {
    hentMineForslag()
      .then(setForslag)
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente forslag.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-5">
      <Link to="/fund" className="smu-btn-ghost inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Fund
      </Link>
      <div>
        <p className="smu-eyebrow">Forslag</p>
        <h1 className="smu-page-title mt-1">Mine forslag</h1>
      </div>

      {fejl && <div className="smu-notice smu-notice-warn"><AlertTriangle size={15} />{fejl}</div>}
      {loading && <p className="smu-meta text-sm">Indlæser…</p>}

      {!loading && !fejl && forslag.length === 0 && (
        <div className="smu-card p-8 text-center">
          <p className="smu-meta text-[13px]">Du har ikke sendt nogen forslag endnu.</p>
        </div>
      )}

      <div className="space-y-2">
        {forslag.map(f => {
          const titel = typeof f.payload?.titel === 'string' ? f.payload.titel : null
          return (
            <div key={f.id} className="smu-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-extrabold text-navy">
                    {FORSLAG_OPERATION_LABEL[f.operation]} · {f.entitet}
                    {titel && <span className="font-bold"> — {titel}</span>}
                  </p>
                  <p className="smu-meta text-[12px] mt-0.5">Sendt {dkDatoTid(f.created_at)}</p>
                  {f.status === 'afvist' && f.afvisning_note && (
                    <p className="smu-meta text-[12px] mt-1">Afvist: {f.afvisning_note}</p>
                  )}
                </div>
                <span className={forslagStatusBadge(f.status)}>{FORSLAG_STATUS_LABEL[f.status]}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
