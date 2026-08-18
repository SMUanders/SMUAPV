import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, ClipboardCheck, ShieldAlert } from 'lucide-react'
import {
  hentMaskineEnkelt, hentOmraader, hentPersoner, hentDagligeTjek, type PersonKort,
} from '../lib/apvApi'
import type { Maskine, Omraade, DagligtTjek } from '../types/apv'
import { MASKINE_STATUS_LABEL, maskineStatusBadge, erAdmin } from '../types/apv'
import { useAuth } from '../context/AuthContext'
import { Raekke, Afsnit, Dokumenter } from '../components/Vis'
import EftersynSektion from '../components/EftersynSektion'
import { dkDatoTid, dkTid, erFortid, kontrolStatus } from '../lib/format'

export default function MaskineDetalje() {
  const { id } = useParams<{ id: string }>()
  const { profil } = useAuth()
  const [m, setM] = useState<Maskine | null>(null)
  const [omraader, setOmraader] = useState<Omraade[]>([])
  const [personer, setPersoner] = useState<PersonKort[]>([])
  const [tjek, setTjek] = useState<DagligtTjek[]>([])
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!id) return
    Promise.all([hentMaskineEnkelt(id), hentOmraader(), hentPersoner(), hentDagligeTjek(id)])
      .then(([ma, o, p, t]) => { setM(ma); setOmraader(o); setPersoner(p); setTjek(t) })
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente maskinen.'))
      .finally(() => setLoading(false))
  }, [id, tick])

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
  const ks = kontrolStatus(tjek[0] ?? null)
  const eftersynForfaldet = erFortid(m.naeste_eftersyn)

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

      {/* Kontrol før brug */}
      <div className="smu-card p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="smu-eyebrow">Kontrol før brug</p>
          <Link to={`/maskiner/${m.id}/dagligt-tjek`} className="smu-btn-primary inline-flex items-center gap-1.5">
            <ClipboardCheck size={15} /> Start kontrol før brug
          </Link>
        </div>

        {/* Dagens status (kontrol før brug gælder i dag) */}
        <div className="mb-4">
          {ks === 'fejl' ? (
            <div className="smu-notice smu-notice-warn !bg-[#fde7e7] !border-[#f2c4c4] !text-[#b53b3b]">
              <ShieldAlert size={15} /> Fejl i dagens kontrol – liften må ikke anvendes.
            </div>
          ) : ks === 'godkendt' ? (
            <p className="text-[13px] font-bold text-teal-deep">
              Kontrolleret i dag · Godkendt kl. {dkTid(tjek[0].created_at)}
              {tjek[0].udfoert_af_navn ? ` · ${tjek[0].udfoert_af_navn}` : ''}
            </p>
          ) : (
            <p className="smu-meta text-[13px]">Ikke kontrolleret i dag.</p>
          )}
        </div>

        <p className="smu-eyebrow mb-2">Kontrolhistorik</p>
        {tjek.length === 0 ? (
          <p className="smu-meta text-[13px]">Ingen kontroller endnu.</p>
        ) : (
          <div className="space-y-2">
            {tjek.slice(0, 5).map(t => (
              <Link key={t.id} to={`/maskiner/${m.id}/tjek/${t.id}`}
                className="smu-list-card block rounded-lg px-3 py-2.5 no-underline">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="text-[13.5px] font-bold text-navy">{dkDatoTid(t.created_at)}</span>
                    <span className="smu-meta text-[12px] ml-2">{t.udfoert_af_navn ?? '—'}</span>
                  </span>
                  <span className={t.status === 'fejl' ? 'smu-badge smu-badge-red' : 'smu-badge smu-badge-green'}>
                    {t.status === 'fejl' ? 'Fejl' : 'Godkendt'}
                  </span>
                </div>
              </Link>
            ))}
            {tjek.length > 5 && <p className="smu-meta text-[12px]">Viser seneste 5 af {tjek.length}.</p>}
          </div>
        )}
      </div>

      <div className="smu-card p-5 space-y-1">
        <Raekke label="Type" værdi={m.type} />
        <Raekke label="Serienummer" værdi={m.serienr} />
        <Raekke label="Fabrikat / model" værdi={m.fabrikat_model} />
        <Raekke label="Årgang" værdi={m.aargang} />
        <Raekke label="Område / lokation" værdi={omraadeNavn} />
        <Raekke label="Ansvarlig" værdi={ansvarligNavn} />
        <Raekke label="Kræver kontrol før brug" værdi={m.daglig_tjek ? 'Ja' : 'Nej'} />
      </div>

      {/* Periodisk eftersyn (adskilt fra grundstatus og kontrol før brug) */}
      <EftersynSektion
        maskineId={m.id}
        senesteEftersynDato={m.seneste_eftersyn}
        naesteEftersynDato={m.naeste_eftersyn}
        eftersynForfaldet={eftersynForfaldet}
        personer={personer}
        erAdmin={erAdmin(profil)}
        onGemt={() => setTick(t => t + 1)}
      />

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
