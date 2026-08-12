import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Clock, FileText, AlertTriangle } from 'lucide-react'
import {
  hentFundEnkelt, hentOmraader, hentPersoner, fundHarAfventendeForslag, type PersonKort,
} from '../lib/apvApi'
import type { Fund, Omraade } from '../types/apv'
import { RisikoBadge, FundStatusBadge } from '../components/Badges'
import { dkDato } from '../lib/format'

export default function FundDetalje() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [fund, setFund] = useState<Fund | null>(null)
  const [omraader, setOmraader] = useState<Omraade[]>([])
  const [personer, setPersoner] = useState<PersonKort[]>([])
  const [harAfventende, setHarAfventende] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([hentFundEnkelt(id), hentOmraader(), hentPersoner(), fundHarAfventendeForslag(id)])
      .then(([f, o, p, a]) => { setFund(f); setOmraader(o); setPersoner(p); setHarAfventende(a) })
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente fundet.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="smu-meta text-sm">Indlæser…</p>
  if (fejl) return <div className="smu-notice smu-notice-warn"><AlertTriangle size={15} />{fejl}</div>
  if (!fund) return (
    <div className="smu-card p-8 text-center">
      <p className="text-[15px] font-bold text-navy mb-3">Fundet findes ikke</p>
      <Link to="/fund" className="smu-btn-secondary">Tilbage til fund</Link>
    </div>
  )

  const omraadeNavn = fund.omraade_id
    ? omraader.find(o => o.id === fund.omraade_id)?.navn ?? '—' : 'Uden område'
  const ansvarligNavn = fund.ansvarlig_id
    ? personer.find(p => p.id === fund.ansvarlig_id)?.fuldt_navn ?? '—' : '—'

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/fund')} className="smu-btn-ghost inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Fund
      </button>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <RisikoBadge niveau={fund.risikoniveau} />
            <FundStatusBadge status={fund.status} />
          </div>
          <h1 className="smu-h1">{fund.titel}</h1>
        </div>
        <Link to={`/fund/${fund.id}/foreslag-aendring`} className="smu-btn-primary inline-flex items-center gap-1.5">
          <Pencil size={15} /> Foreslå ændring
        </Link>
      </div>

      {harAfventende && (
        <div className="smu-notice smu-notice-info">
          <Clock size={15} />
          Dette fund har mindst ét afventende forslag under behandling.
        </div>
      )}

      <div className="smu-card p-5 space-y-1">
        <Række label="Område" værdi={omraadeNavn} />
        <Række label="Ansvarlig" værdi={ansvarligNavn} />
        <Række label="Status" værdi={<FundStatusBadge status={fund.status} />} />
        <Række label="Deadline" værdi={fund.deadline ? dkDato(fund.deadline) : '—'} />
      </div>

      <div className="smu-card p-5 space-y-3">
        <Afsnit label="Beskrivelse (problem/risiko)" tekst={fund.beskrivelse} />
        <Afsnit label="Kilde / årsag" tekst={fund.kilde_aarsag} />
        <Afsnit label="Særlige grupper" tekst={fund.saerlige_grupper} />
        <Afsnit label="Nuværende foranstaltninger" tekst={fund.nuvaerende_foranstaltninger} />
      </div>

      {/* Risikovurdering */}
      <div className="smu-card p-5">
        <p className="smu-eyebrow mb-3">Risikovurdering</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Tal label="Alvorlighed" v={fund.alvor} />
          <Tal label="Sandsynlighed" v={fund.sandsynlighed} />
          <Tal label="Score" v={fund.score} stærk />
          <div>
            <span className="smu-label">Risikoniveau</span>
            <div className="mt-0.5"><RisikoBadge niveau={fund.risikoniveau} /></div>
          </div>
        </div>

        {(fund.alvor_efter != null || fund.sandsynlighed_efter != null) && (
          <>
            <p className="smu-eyebrow mt-5 mb-3">Restrisiko efter tiltag</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Tal label="Alvorlighed efter" v={fund.alvor_efter} />
              <Tal label="Sandsynlighed efter" v={fund.sandsynlighed_efter} />
              <Tal label="Score efter" v={fund.score_efter} stærk />
              <div>
                <span className="smu-label">Niveau efter</span>
                <div className="mt-0.5"><RisikoBadge niveau={fund.risikoniveau_efter} /></div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dokumenter */}
      <div className="smu-card p-5">
        <p className="smu-eyebrow mb-3">Dokumentreferencer</p>
        {fund.dokumenter.length === 0
          ? <p className="smu-meta text-[13px]">Ingen dokumenter tilknyttet.</p>
          : (
            <ul className="space-y-1.5">
              {fund.dokumenter.map((d, i) => (
                <li key={i} className="flex items-center gap-2 text-[13px]">
                  <FileText size={14} className="text-text-muted shrink-0" />
                  {d.url
                    ? <a href={d.url} target="_blank" rel="noreferrer" className="smu-link">{d.navn || d.url}</a>
                    : <span className="font-semibold text-text">{d.navn}</span>}
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  )
}

function Række({ label, værdi }: { label: string; værdi: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border-soft last:border-0">
      <span className="smu-eyebrow">{label}</span>
      <span className="text-[13px] font-bold text-navy text-right">{værdi}</span>
    </div>
  )
}

function Afsnit({ label, tekst }: { label: string; tekst: string | null }) {
  return (
    <div>
      <span className="smu-label">{label}</span>
      <p className="text-[14px] font-semibold text-text whitespace-pre-wrap">
        {tekst?.trim() ? tekst : <span className="text-text-muted font-normal">—</span>}
      </p>
    </div>
  )
}

function Tal({ label, v, stærk }: { label: string; v: number | null; stærk?: boolean }) {
  return (
    <div>
      <span className="smu-label">{label}</span>
      <p className={`${stærk ? 'text-[20px] font-extrabold' : 'text-[16px] font-bold'} text-navy`}>
        {v ?? '—'}
      </p>
    </div>
  )
}
