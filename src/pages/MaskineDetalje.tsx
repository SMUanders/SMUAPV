import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { hentMaskineEnkelt, hentOmraader, hentPersoner, type PersonKort } from '../lib/apvApi'
import type { Maskine, Omraade } from '../types/apv'
import { MASKINE_STATUS_LABEL, maskineStatusBadge } from '../types/apv'
import { Raekke, Afsnit, Dokumenter } from '../components/Vis'
import { dkDato } from '../lib/format'

export default function MaskineDetalje() {
  const { id } = useParams<{ id: string }>()
  const [m, setM] = useState<Maskine | null>(null)
  const [omraader, setOmraader] = useState<Omraade[]>([])
  const [personer, setPersoner] = useState<PersonKort[]>([])
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([hentMaskineEnkelt(id), hentOmraader(), hentPersoner()])
      .then(([ma, o, p]) => { setM(ma); setOmraader(o); setPersoner(p) })
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente maskinen.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="smu-meta text-sm">Indlæser…</p>
  if (fejl) return <div className="smu-notice smu-notice-warn"><AlertTriangle size={15} />{fejl}</div>
  if (!m) return (
    <div className="smu-card p-8 text-center">
      <p className="text-[15px] font-bold text-navy mb-3">Maskinen findes ikke</p>
      <Link to="/maskiner" className="smu-btn-secondary">Tilbage til maskiner</Link>
    </div>
  )

  const omraadeNavn = m.omraade_id ? omraader.find(o => o.id === m.omraade_id)?.navn ?? '—' : '—'
  const ansvarligNavn = m.ansvarlig_id ? personer.find(p => p.id === m.ansvarlig_id)?.fuldt_navn ?? '—' : '—'

  return (
    <div className="space-y-5">
      <Link to="/maskiner" className="smu-btn-ghost inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Maskiner
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="smu-eyebrow">Maskine</p>
          <h1 className="smu-h1 mt-1">{m.navn}</h1>
          <p className="smu-meta text-[13px] mt-1">{m.fabrikat_model ?? m.type ?? '—'}</p>
        </div>
        <span className={maskineStatusBadge(m.status)}>{MASKINE_STATUS_LABEL[m.status]}</span>
      </div>

      <div className="smu-card p-5 space-y-1">
        <Raekke label="Type" værdi={m.type} />
        <Raekke label="Serienummer" værdi={m.serienr} />
        <Raekke label="Fabrikat / model" værdi={m.fabrikat_model} />
        <Raekke label="Årgang" værdi={m.aargang} />
        <Raekke label="Område / lokation" værdi={omraadeNavn} />
        <Raekke label="Ansvarlig" værdi={ansvarligNavn} />
        <Raekke label="Dagligt tjek" værdi={m.daglig_tjek ? 'Ja' : 'Nej'} />
      </div>

      {/* Eftersyn */}
      <div className="smu-card p-5">
        <p className="smu-eyebrow mb-3">Eftersyn</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <span className="smu-label">Interval</span>
            <p className="text-[16px] font-bold text-navy">{m.eftersyn_interval_mdr ? `${m.eftersyn_interval_mdr} mdr` : '—'}</p>
          </div>
          <div>
            <span className="smu-label">Seneste eftersyn</span>
            <p className="text-[16px] font-bold text-navy">{m.seneste_eftersyn ? dkDato(m.seneste_eftersyn) : '—'}</p>
          </div>
          <div>
            <span className="smu-label">Næste eftersyn</span>
            <p className="text-[16px] font-extrabold text-navy">{m.naeste_eftersyn ? dkDato(m.naeste_eftersyn) : '—'}</p>
          </div>
        </div>
        <p className="smu-meta text-[11px] mt-3">Seneste og næste eftersyn beregnes ud fra eftersynsloggen og maskinens interval.</p>
      </div>

      {m.note && (
        <div className="smu-card p-5"><Afsnit label="Note" tekst={m.note} /></div>
      )}

      <div className="smu-card p-5">
        <p className="smu-eyebrow mb-3">Dokumentreferencer</p>
        <Dokumenter dokumenter={m.dokumenter} />
      </div>
    </div>
  )
}
