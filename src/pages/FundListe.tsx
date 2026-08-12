import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, AlertTriangle } from 'lucide-react'
import { hentFund, hentOmraader, hentPersoner, type PersonKort } from '../lib/apvApi'
import type { Fund, Omraade, FundStatus, Risikoniveau } from '../types/apv'
import { FUND_STATUS_LABEL } from '../types/apv'
import { RisikoBadge, FundStatusBadge } from '../components/Badges'
import { dkDato } from '../lib/format'

const RISIKO_RÆKKE: Record<Risikoniveau, number> = { kritisk: 0, hoej: 1, middel: 2, lav: 3 }

export default function FundListe() {
  const [fund, setFund] = useState<Fund[]>([])
  const [omraader, setOmraader] = useState<Omraade[]>([])
  const [personer, setPersoner] = useState<PersonKort[]>([])
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')
  const [sog, setSog] = useState('')
  const [statusFilter, setStatusFilter] = useState<FundStatus | 'alle'>('alle')

  useEffect(() => {
    Promise.all([hentFund(), hentOmraader(), hentPersoner()])
      .then(([f, o, p]) => { setFund(f); setOmraader(o); setPersoner(p) })
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente fund.'))
      .finally(() => setLoading(false))
  }, [])

  const omraadeNavn = useMemo(
    () => Object.fromEntries(omraader.map(o => [o.id, o.navn])), [omraader])
  const personNavn = useMemo(
    () => Object.fromEntries(personer.map(p => [p.id, p.fuldt_navn ?? 'Unavngivet'])), [personer])

  const synlige = useMemo(() => {
    const q = sog.trim().toLowerCase()
    return fund
      .filter(f => statusFilter === 'alle' || f.status === statusFilter)
      .filter(f => !q
        || f.titel.toLowerCase().includes(q)
        || (f.beskrivelse ?? '').toLowerCase().includes(q)
        || (f.omraade_id ? (omraadeNavn[f.omraade_id] ?? '') : '').toLowerCase().includes(q))
  }, [fund, sog, statusFilter, omraadeNavn])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="smu-eyebrow">APV</p>
          <h1 className="smu-page-title mt-1">Fund</h1>
        </div>
        <Link to="/fund/nyt" className="smu-btn-primary inline-flex items-center gap-1.5">
          <Plus size={15} /> Nyt fund
        </Link>
      </div>

      {/* Filtre */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input className="smu-input pl-9" placeholder="Søg i titel, beskrivelse eller område"
            value={sog} onChange={e => setSog(e.target.value)} />
        </div>
        <select className="smu-input w-auto" value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as FundStatus | 'alle')}>
          <option value="alle">Alle statusser</option>
          {(Object.keys(FUND_STATUS_LABEL) as FundStatus[]).map(s =>
            <option key={s} value={s}>{FUND_STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {fejl && <div className="smu-notice smu-notice-warn"><AlertTriangle size={15} />{fejl}</div>}
      {loading && <p className="smu-meta text-sm">Indlæser…</p>}

      {!loading && !fejl && synlige.length === 0 && (
        <div className="smu-card p-8 text-center">
          <p className="text-[15px] font-bold text-navy mb-1">Ingen fund endnu</p>
          <p className="smu-meta text-[13px] mb-4">Opret det første fund som et forslag — admin godkender det.</p>
          <Link to="/fund/nyt" className="smu-btn-primary inline-flex items-center gap-1.5">
            <Plus size={15} /> Nyt fund
          </Link>
        </div>
      )}

      {!loading && synlige.length > 0 && (
        <div className="space-y-2">
          {[...synlige].sort(sorterEfterRisiko).map(f => (
            <Link key={f.id} to={`/fund/${f.id}`}
              className="smu-card smu-list-card block p-4 no-underline">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-extrabold text-navy truncate">{f.titel}</p>
                  <p className="smu-meta text-[12px] mt-0.5">
                    {f.omraade_id ? (omraadeNavn[f.omraade_id] ?? '—') : 'Uden område'}
                    {f.ansvarlig_id && <> · {personNavn[f.ansvarlig_id] ?? '—'}</>}
                    {f.deadline && <> · frist {dkDato(f.deadline)}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <RisikoBadge niveau={f.risikoniveau} />
                  <FundStatusBadge status={f.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function sorterEfterRisiko(a: Fund, b: Fund): number {
  const ra = a.risikoniveau ? RISIKO_RÆKKE[a.risikoniveau] : 9
  const rb = b.risikoniveau ? RISIKO_RÆKKE[b.risikoniveau] : 9
  if (ra !== rb) return ra - rb
  return (b.score ?? 0) - (a.score ?? 0)
}
