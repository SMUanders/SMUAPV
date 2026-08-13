import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, ShieldAlert, Check, X, Minus } from 'lucide-react'
import { hentDagligtTjek } from '../lib/apvApi'
import { TJEK_RESULTAT_LABEL, type DagligtTjek, type DagligtTjekPunkt, type TjekResultat } from '../types/apv'
import { dkDatoTid } from '../lib/format'

const KRITISKE = new Set([1, 2])

function ResultatMærke({ r }: { r: TjekResultat }) {
  const cfg = {
    ok: { cls: 'smu-badge smu-badge-green', Ikon: Check },
    fejl: { cls: 'smu-badge smu-badge-red', Ikon: X },
    ikke_relevant: { cls: 'smu-badge smu-badge-grey', Ikon: Minus },
  }[r]
  const Ikon = cfg.Ikon
  return <span className={`${cfg.cls} inline-flex items-center gap-1`}><Ikon size={11} />{TJEK_RESULTAT_LABEL[r]}</span>
}

export default function DagligtTjekVis() {
  const { id, tjekId } = useParams<{ id: string; tjekId: string }>()
  const [tjek, setTjek] = useState<DagligtTjek | null>(null)
  const [punkter, setPunkter] = useState<DagligtTjekPunkt[]>([])
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')

  useEffect(() => {
    if (!tjekId) return
    hentDagligtTjek(tjekId)
      .then(({ tjek, punkter }) => { setTjek(tjek); setPunkter(punkter) })
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente tjekket.'))
      .finally(() => setLoading(false))
  }, [tjekId])

  if (loading) return <p className="smu-meta text-sm">Indlæser…</p>
  if (fejl) return <div className="smu-notice smu-notice-warn"><AlertTriangle size={15} />{fejl}</div>
  if (!tjek) return (
    <div className="smu-card p-8 text-center">
      <p className="text-[15px] font-bold text-navy mb-3">Tjekket findes ikke</p>
      <Link to={`/maskiner/${id}`} className="smu-btn-secondary">Tilbage til maskinen</Link>
    </div>
  )

  const fejlet = tjek.status === 'fejl'

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <Link to={`/maskiner/${id}`} className="smu-btn-ghost inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Maskine
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="smu-eyebrow">Dagligt tjek</p>
          <h1 className="smu-h1 mt-1">{dkDatoTid(tjek.created_at)}</h1>
          <p className="smu-meta text-[13px] mt-1">{tjek.udfoert_af_navn ?? 'Ukendt bruger'}</p>
        </div>
        <span className={fejlet ? 'smu-badge smu-badge-red' : 'smu-badge smu-badge-green'}>
          {fejlet ? 'Fejl' : 'Godkendt'}
        </span>
      </div>

      {fejlet && (
        <div className="smu-notice smu-notice-warn !bg-[#fde7e7] !border-[#f2c4c4] !text-[#b53b3b]">
          <ShieldAlert size={16} /> Lift må ikke anvendes — kontrollen har mindst én fejl.
        </div>
      )}

      <div className="space-y-2">
        {punkter.map(p => (
          <div key={p.id} className={`smu-card p-3.5 ${KRITISKE.has(p.punkt_nr) ? 'border-l-4 border-l-[#b53b3b]' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13.5px] font-bold text-navy">
                <span className="text-text-muted">{p.punkt_nr}.</span> {p.punkt_tekst}
              </p>
              <span className="shrink-0"><ResultatMærke r={p.resultat} /></span>
            </div>
            {p.note && <p className="smu-meta text-[12.5px] mt-1.5 whitespace-pre-wrap">Note: {p.note}</p>}
          </div>
        ))}
      </div>

      {tjek.note && (
        <div className="smu-card p-4">
          <span className="smu-label">Samlet bemærkning</span>
          <p className="text-[14px] font-semibold text-text whitespace-pre-wrap">{tjek.note}</p>
        </div>
      )}

      <p className="smu-meta text-[11px]">Gemt {dkDatoTid(tjek.created_at)} · kan ikke redigeres.</p>
    </div>
  )
}
