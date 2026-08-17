import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { hentPaabudEnkelt, hentPersoner, type PersonKort } from '../lib/apvApi'
import type { Paabud } from '../types/apv'
import { PAABUD_TYPE_LABEL, PAABUD_STATUS_LABEL, paabudStatusBadge } from '../types/apv'
import { Raekke, Afsnit, Dokumenter } from '../components/Vis'
import { dkDato } from '../lib/format'

export default function PaabudDetalje() {
  const { id } = useParams<{ id: string }>()
  const [p, setP] = useState<Paabud | null>(null)
  const [personer, setPersoner] = useState<PersonKort[]>([])
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([hentPaabudEnkelt(id), hentPersoner()])
      .then(([pa, pe]) => { setP(pa); setPersoner(pe) })
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente påbuddet.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="smu-meta text-sm">Indlæser…</p>
  if (fejl) return <div className="smu-notice smu-notice-warn"><AlertTriangle size={15} />{fejl}</div>
  if (!p) return (
    <div className="smu-card p-8 text-center">
      <p className="text-[15px] font-bold text-navy mb-3">Påbuddet findes ikke</p>
      <Link to="/paabud" className="smu-btn-secondary">Tilbage til påbud</Link>
    </div>
  )

  const aktiv = p.status !== 'afsluttet'
  const mangler = <span className="font-bold text-orange-deep">mangler</span>
  const ansvarligNavn: React.ReactNode = p.ansvarlig_id
    ? personer.find(pe => pe.id === p.ansvarlig_id)?.fuldt_navn ?? '—'
    : (aktiv ? <>Ansvarlig {mangler}</> : '—')
  const fristVaerdi: React.ReactNode = p.frist
    ? dkDato(p.frist)
    : (aktiv ? <>Frist {mangler}</> : '—')

  return (
    <div className="space-y-5">
      <Link to="/paabud" className="smu-btn-ghost inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Påbud
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="smu-eyebrow">{PAABUD_TYPE_LABEL[p.type]} · {p.myndighed}</p>
          <h1 className="smu-h1 mt-1">{p.titel}</h1>
        </div>
        <span className={paabudStatusBadge(p.status)}>{PAABUD_STATUS_LABEL[p.status]}</span>
      </div>

      <div className="smu-card p-5 space-y-1">
        <Raekke label="Type" værdi={PAABUD_TYPE_LABEL[p.type]} />
        <Raekke label="Myndighed" værdi={p.myndighed} />
        <Raekke label="Dato modtaget" værdi={p.dato_modtaget ? dkDato(p.dato_modtaget) : '—'} />
        <Raekke label="Frist" værdi={fristVaerdi} />
        <Raekke label="Ansvarlig" værdi={ansvarligNavn} />
        <Raekke label="Tilbagemelding til AT" værdi={p.dato_tilbagemelding ? dkDato(p.dato_tilbagemelding) : '—'} />
      </div>

      {p.krav && (
        <div className="smu-card p-5"><Afsnit label="Krav" tekst={p.krav} /></div>
      )}

      <div className="smu-card p-5">
        <p className="smu-eyebrow mb-3">Dokumentation</p>
        <Dokumenter dokumenter={p.dokumenter} />
      </div>
    </div>
  )
}
