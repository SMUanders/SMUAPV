import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { hentMaskineEnkelt, opretDagligtTjek, type TjekPunktInput } from '../lib/apvApi'
import { LIFT_KONTROLPUNKTER, type Maskine, type TjekResultat } from '../types/apv'

interface Svar { resultat?: TjekResultat; note: string }

const VALG: { v: TjekResultat; label: string; aktiv: string }[] = [
  { v: 'ok', label: 'OK', aktiv: 'bg-teal text-white border-teal' },
  { v: 'fejl', label: 'Fejl', aktiv: 'bg-[#b53b3b] text-white border-[#b53b3b]' },
  { v: 'ikke_relevant', label: 'Ikke relevant', aktiv: 'bg-grey-deep text-white border-grey-deep' },
]

export default function DagligtTjek() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profil } = useAuth()
  const [maskine, setMaskine] = useState<Maskine | null>(null)
  const [loading, setLoading] = useState(true)
  const [svar, setSvar] = useState<Record<number, Svar>>({})
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [fejl, setFejl] = useState('')

  const nu = useMemo(() => new Date().toLocaleString('da-DK', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }), [])

  useEffect(() => {
    if (!id) return
    hentMaskineEnkelt(id)
      .then(setMaskine)
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente maskinen.'))
      .finally(() => setLoading(false))
  }, [id])

  function sæt(nr: number, delta: Partial<Svar>) {
    setSvar(prev => {
      const cur: Svar = prev[nr] ?? { note: '' }
      return { ...prev, [nr]: { ...cur, ...delta } }
    })
  }

  const alleBesvaret = LIFT_KONTROLPUNKTER.every(k => svar[k.nr]?.resultat)
  const harFejl = LIFT_KONTROLPUNKTER.some(k => svar[k.nr]?.resultat === 'fejl')

  async function godkend() {
    if (!id || !alleBesvaret) return
    setBusy(true); setFejl('')
    const punkter: TjekPunktInput[] = LIFT_KONTROLPUNKTER.map(k => ({
      punkt_nr: k.nr,
      punkt_tekst: k.tekst,
      resultat: svar[k.nr]!.resultat!,
      note: svar[k.nr]?.note?.trim() || null,
    }))
    try {
      const tjekId = await opretDagligtTjek(id, punkter, note.trim() || null)
      navigate(`/maskiner/${id}/tjek/${tjekId}`, { replace: true })
    } catch (e) {
      setFejl((e as Error).message ?? 'Kunne ikke gemme tjekket.')
      setBusy(false)
    }
  }

  if (loading) return <p className="smu-meta text-sm">Indlæser…</p>
  if (!maskine) return (
    <div className="smu-card p-8 text-center">
      <p className="text-[15px] font-bold text-navy mb-3">Maskinen findes ikke</p>
      <Link to="/maskiner" className="smu-btn-secondary">Tilbage til maskiner</Link>
    </div>
  )

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-28">
      <Link to={`/maskiner/${id}`} className="smu-btn-ghost inline-flex items-center gap-1">
        <ArrowLeft size={14} /> {maskine.navn}
      </Link>

      <div>
        <p className="smu-eyebrow">Dagligt tjek</p>
        <h1 className="smu-h1 mt-1">{maskine.navn}</h1>
        <p className="smu-meta text-[13px] mt-1">
          {nu} · {profil?.fuldt_navn ?? 'Ukendt bruger'}
        </p>
      </div>

      {harFejl && (
        <div className="smu-notice smu-notice-warn !bg-[#fde7e7] !border-[#f2c4c4] !text-[#b53b3b]">
          <ShieldAlert size={16} /> Lift må ikke anvendes — mindst ét punkt er markeret som fejl.
        </div>
      )}

      <div className="space-y-3">
        {LIFT_KONTROLPUNKTER.map(k => {
          const s = svar[k.nr]
          return (
            <div key={k.nr} className={`smu-card p-4 ${k.kritisk ? 'border-l-4 border-l-[#b53b3b]' : ''}`}>
              <div className="flex items-start gap-2 mb-3">
                <span className="text-[13px] font-extrabold text-text-muted shrink-0">{k.nr}.</span>
                <p className="text-[14px] font-bold text-navy">
                  {k.tekst}
                  {k.kritisk && <span className="smu-badge smu-badge-red ml-2 align-middle">Kritisk</span>}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {VALG.map(o => {
                  const valgt = s?.resultat === o.v
                  return (
                    <button key={o.v} type="button" onClick={() => sæt(k.nr, { resultat: o.v })}
                      className={`py-3 rounded-[10px] border font-extrabold text-[13px] transition-colors ${
                        valgt ? o.aktiv : 'bg-card border-border text-text-muted hover:bg-row-bg'}`}>
                      {o.label}
                    </button>
                  )
                })}
              </div>
              {s?.resultat === 'fejl' && (
                <textarea className="smu-input mt-3 min-h-[56px]" placeholder="Beskriv fejlen…"
                  value={s.note} onChange={e => sæt(k.nr, { note: e.target.value })} />
              )}
            </div>
          )
        })}
      </div>

      <div className="smu-card p-4">
        <span className="smu-label">Samlet bemærkning (valgfri)</span>
        <textarea className="smu-input min-h-[56px]" value={note} onChange={e => setNote(e.target.value)} />
      </div>

      <p className="smu-meta text-[11px]">
        Rækværk skal ALTID være oppe og låst. Selen er kun til bevægelsesbegrænsning på platformen.
        Tjekket kan ikke redigeres, når det er gemt.
      </p>

      {fejl && <div className="smu-notice smu-notice-warn"><AlertTriangle size={15} />{fejl}</div>}

      {/* Fast bund-handling (mobilvenlig) */}
      <div className="fixed inset-x-0 bottom-0 bg-card border-t border-border p-3">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <p className="smu-meta text-[12px] flex-1">
            {alleBesvaret
              ? (harFejl ? 'Tjek med fejl — liften må ikke anvendes.' : 'Alle punkter OK.')
              : `Besvar alle ${LIFT_KONTROLPUNKTER.length} punkter.`}
          </p>
          <button onClick={godkend} disabled={!alleBesvaret || busy}
            className={harFejl ? 'smu-btn-secondary' : 'smu-btn-success'}>
            {busy ? 'Gemmer…' : harFejl ? 'Registrér tjek (fejl)' : 'Godkend tjek'}
          </button>
        </div>
      </div>
    </div>
  )
}
