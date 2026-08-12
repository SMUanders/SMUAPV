import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, ClipboardList } from 'lucide-react'
import { hentKemikalieEnkelt, hentKrvForKemikalie } from '../lib/apvApi'
import type { Kemikalie, Krv } from '../types/apv'
import { Raekke, Afsnit, Etiketter, Dokumenter } from '../components/Vis'
import { dkDato } from '../lib/format'

export default function KemikalieDetalje() {
  const { id } = useParams<{ id: string }>()
  const [k, setK] = useState<Kemikalie | null>(null)
  const [krv, setKrv] = useState<Krv[]>([])
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')

  useEffect(() => {
    if (!id) return
    hentKemikalieEnkelt(id)
      .then(async kem => {
        setK(kem)
        if (kem) setKrv(await hentKrvForKemikalie(kem.id))
      })
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente kemikaliet.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="smu-meta text-sm">Indlæser…</p>
  if (fejl) return <div className="smu-notice smu-notice-warn"><AlertTriangle size={15} />{fejl}</div>
  if (!k) return (
    <div className="smu-card p-8 text-center">
      <p className="text-[15px] font-bold text-navy mb-3">Kemikaliet findes ikke</p>
      <Link to="/kemikalier" className="smu-btn-secondary">Tilbage til kemikalier</Link>
    </div>
  )

  const subst = k.substitution_mulig == null ? '—' : (k.substitution_mulig ? 'Ja' : 'Nej')

  return (
    <div className="space-y-5">
      <Link to="/kemikalier" className="smu-btn-ghost inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Kemikalier
      </Link>

      <div>
        <p className="smu-eyebrow">Kemikalie</p>
        <h1 className="smu-h1 mt-1">{k.produktnavn}</h1>
        <p className="smu-meta text-[13px] mt-1">{k.leverandoer ?? '—'}</p>
      </div>

      {/* Fare */}
      <div className="smu-card p-5 space-y-4">
        <Etiketter label="H-sætninger" vaerdier={k.h_saetninger} variant="orange" tom="Ingen H-sætninger angivet" />
        <Etiketter label="Piktogrammer" vaerdier={k.piktogrammer} tom="Ikke importeret fra Excel (piktogramfelt manglede)" />
      </div>

      {/* Stamdata */}
      <div className="smu-card p-5 space-y-1">
        <Raekke label="SDS-dato" værdi={k.sds_dato ? dkDato(k.sds_dato) : '—'} />
        <Raekke label="Forbrug pr. uge" værdi={k.forbrug} />
        <Raekke label="Lagermængde" værdi={k.lagermaengde} />
        <Raekke label="Opbevaringssted" værdi={k.opbevaringssted} />
        <Raekke label="Substitution mulig" værdi={subst} />
        <Raekke label="Ventilation" værdi={k.ventilation} />
      </div>

      {/* Anvendelse + sikkerhed */}
      <div className="smu-card p-5 space-y-3">
        <Afsnit label="Anvendelse / proces" tekst={k.anvendelse} />
        <Afsnit label="Eksponeringsveje" tekst={k.eksponeringsveje} />
        <Afsnit label="PPE (værnemidler)" tekst={k.ppe} />
        <Afsnit label="Affald / eliminering" tekst={k.affald} />
        <Afsnit label="Arbejdsprocedure" tekst={k.arbejdsprocedure} />
      </div>

      {/* SDS / dokumenter */}
      <div className="smu-card p-5">
        <p className="smu-eyebrow mb-3">Dokumentation / SDS</p>
        <Dokumenter dokumenter={k.dokumenter} />
      </div>

      {/* KRV kontekstuelt */}
      <div className="smu-card p-5">
        <p className="smu-eyebrow mb-3">Kemisk risikovurdering (KRV)</p>
        {krv.length === 0
          ? <p className="smu-meta text-[13px]">Ingen KRV registreret for dette kemikalie.</p>
          : (
            <div className="space-y-2">
              {krv.map(v => (
                <div key={v.id} className="rounded-lg border border-border-soft p-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={15} className="text-primary" />
                    <p className="text-[14px] font-extrabold text-navy">{v.opgave_proces}</p>
                  </div>
                  <div className="mt-2 grid sm:grid-cols-2 gap-x-4 gap-y-1">
                    {v.arbejdsform && <Raekke label="Arbejdsform" værdi={v.arbejdsform} />}
                    {v.ventilation && <Raekke label="Ventilation" værdi={v.ventilation} />}
                    {v.score_foer != null && <Raekke label="Vurdering før" værdi={v.score_foer} />}
                    {v.score_efter != null && <Raekke label="Vurdering efter" værdi={v.score_efter} />}
                    {v.acceptabel != null && <Raekke label="Acceptabel" værdi={v.acceptabel ? 'Ja' : 'Nej'} />}
                  </div>
                  {v.foranstaltninger && <div className="mt-2"><Afsnit label="Foranstaltninger" tekst={v.foranstaltninger} /></div>}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}
