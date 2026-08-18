import { useEffect, useState } from 'react'
import { Plus, AlertTriangle, X } from 'lucide-react'
import { hentEftersyn, opretEftersyn, type PersonKort } from '../lib/apvApi'
import {
  EFTERSYN_RESULTAT_LABEL, eftersynResultatBadge,
  type Eftersyn, type EftersynResultat,
} from '../types/apv'
import { dkDato, dkMaanedAar } from '../lib/format'

const RESULTATER: EftersynResultat[] = ['ok', 'anmaerkning', 'kasseret']

export default function EftersynSektion({
  maskineId, senesteEftersynDato, naesteEftersynDato, eftersynForfaldet, personer, erAdmin, onGemt,
}: {
  maskineId: string
  senesteEftersynDato: string | null
  naesteEftersynDato: string | null
  eftersynForfaldet: boolean
  personer: PersonKort[]
  erAdmin: boolean
  onGemt: () => void
}) {
  const [eftersyn, setEftersyn] = useState<Eftersyn[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [aabenForm, setAabenForm] = useState(false)

  useEffect(() => {
    hentEftersyn(maskineId)
      .then(setEftersyn)
      .catch(() => setEftersyn([]))
      .finally(() => setLoading(false))
  }, [maskineId, tick])

  const personNavn = (id: string | null) =>
    id ? (personer.find(p => p.id === id)?.fuldt_navn ?? 'Ukendt') : null
  const udfoertAf = (e: Eftersyn) =>
    personNavn(e.udfoert_af_id) ?? e.udfoert_af_fritekst ?? '—'

  const seneste = eftersyn[0] ?? null

  return (
    <div className="smu-card p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="smu-eyebrow">Periodisk eftersyn</p>
        {erAdmin && !aabenForm && (
          <button onClick={() => setAabenForm(true)} className="smu-btn-primary inline-flex items-center gap-1.5">
            <Plus size={15} /> Registrér eftersyn
          </button>
        )}
      </div>

      {eftersynForfaldet && !aabenForm && (
        <div className="smu-notice smu-notice-warn mb-3">
          <AlertTriangle size={15} /> Eftersyn forfaldet — beregnet næste eftersyn var {dkDato(naesteEftersynDato)}.
        </div>
      )}

      {/* Admin-formular */}
      {aabenForm && (
        <EftersynForm maskineId={maskineId} personer={personer}
          onAnnuller={() => setAabenForm(false)}
          onGemt={() => { setAabenForm(false); setTick(t => t + 1); onGemt() }} />
      )}

      {/* Seneste + næste */}
      {!aabenForm && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <span className="smu-label">Seneste eftersyn</span>
              {seneste ? (
                <div className="mt-0.5 space-y-1">
                  <p className="text-[16px] font-extrabold text-navy">{dkDato(seneste.dato)}</p>
                  <p className="smu-meta text-[12px]">Udført af: {udfoertAf(seneste)}</p>
                  <p className="smu-meta text-[12px]">
                    Resultat: <span className={eftersynResultatBadge(seneste.resultat)}>{EFTERSYN_RESULTAT_LABEL[seneste.resultat]}</span>
                  </p>
                  {seneste.maerkat_nr && <p className="smu-meta text-[12px]">Mærkat nr.: {seneste.maerkat_nr}</p>}
                </div>
              ) : (
                <p className="text-[13px] text-text-muted mt-0.5">Intet eftersyn registreret endnu.</p>
              )}
            </div>
            <div>
              <span className="smu-label">Næste eftersyn (senest)</span>
              <p className={`text-[16px] font-extrabold ${eftersynForfaldet ? 'text-orange-deep' : 'text-navy'}`}>
                {naesteEftersynDato ? dkMaanedAar(naesteEftersynDato) : '—'}
              </p>
              {senesteEftersynDato && (
                <p className="smu-meta text-[11px] mt-1">Beregnet ud fra seneste eftersyn + interval.</p>
              )}
            </div>
          </div>

          {/* Historik */}
          <div className="mt-5">
            <p className="smu-eyebrow mb-2">Eftersynshistorik</p>
            {loading ? (
              <p className="smu-meta text-[13px]">Indlæser…</p>
            ) : eftersyn.length === 0 ? (
              <p className="smu-meta text-[13px]">Ingen eftersyn registreret.</p>
            ) : (
              <div className="space-y-2">
                {eftersyn.map(e => (
                  <div key={e.id} className="rounded-lg border border-border-soft px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="text-[13.5px] font-bold text-navy">{dkDato(e.dato)}</span>
                        <span className="smu-meta text-[12px] ml-2">{udfoertAf(e)}</span>
                        {e.maerkat_nr && <span className="smu-meta text-[12px] ml-2">· mærkat {e.maerkat_nr}</span>}
                      </span>
                      <span className={`${eftersynResultatBadge(e.resultat)} shrink-0`}>
                        {EFTERSYN_RESULTAT_LABEL[e.resultat]}
                      </span>
                    </div>
                    {e.note && <p className="smu-meta text-[12px] mt-1 whitespace-pre-wrap">{e.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="smu-meta text-[11px] mt-3">
            Seneste og næste eftersyn udledes af eftersynsloggen + interval. Adskilt fra maskinens grundstatus og kontrol før brug.
          </p>
        </>
      )}
    </div>
  )
}

// ── Registreringsformular (admin) ──────────────────────────────
function EftersynForm({ maskineId, personer, onAnnuller, onGemt }: {
  maskineId: string
  personer: PersonKort[]
  onAnnuller: () => void
  onGemt: () => void
}) {
  const [dato, setDato] = useState('')
  const [mode, setMode] = useState<'intern' | 'ekstern'>('ekstern')
  const [udfoertAfId, setUdfoertAfId] = useState('')
  const [firma, setFirma] = useState('')
  const [resultat, setResultat] = useState<EftersynResultat>('ok')
  const [maerkat, setMaerkat] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [fejl, setFejl] = useState('')

  async function gem(e: React.FormEvent) {
    e.preventDefault()
    setFejl('')
    if (!dato) { setFejl('Angiv datoen for det udførte eftersyn.'); return }
    if (mode === 'intern' && !udfoertAfId) { setFejl('Vælg den interne medarbejder.'); return }
    if (mode === 'ekstern' && !firma.trim()) { setFejl('Angiv servicefirmaets navn.'); return }
    setBusy(true)
    try {
      await opretEftersyn({
        maskine_id: maskineId,
        dato,
        udfoert_af_id: mode === 'intern' ? udfoertAfId : null,
        udfoert_af_fritekst: mode === 'ekstern' ? firma.trim() : null,
        resultat,
        maerkat_nr: maerkat.trim() || null,
        note: note.trim() || null,
      })
      onGemt()
    } catch (err) {
      setFejl((err as Error).message ?? 'Kunne ikke gemme eftersynet.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={gem} className="rounded-lg border border-border p-4 space-y-4 mb-4">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-extrabold text-navy">Registrér eftersyn</p>
        <button type="button" onClick={onAnnuller} className="smu-btn-secondary px-2" aria-label="Luk"><X size={15} /></button>
      </div>

      <div>
        <span className="smu-label">Dato for udført eftersyn</span>
        <input type="date" className="smu-input" value={dato} onChange={e => setDato(e.target.value)} />
      </div>

      <div>
        <span className="smu-label">Udført af</span>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button type="button" onClick={() => setMode('intern')}
            className={`py-2 rounded-lg border font-bold text-[13px] ${mode === 'intern' ? 'bg-primary text-white border-primary' : 'bg-card border-border text-text-muted'}`}>
            Intern medarbejder
          </button>
          <button type="button" onClick={() => setMode('ekstern')}
            className={`py-2 rounded-lg border font-bold text-[13px] ${mode === 'ekstern' ? 'bg-primary text-white border-primary' : 'bg-card border-border text-text-muted'}`}>
            Eksternt servicefirma
          </button>
        </div>
        {mode === 'intern' ? (
          <select className="smu-input" value={udfoertAfId} onChange={e => setUdfoertAfId(e.target.value)}>
            <option value="">— Vælg medarbejder —</option>
            {personer.map(p => <option key={p.id} value={p.id}>{p.fuldt_navn ?? 'Unavngivet'}</option>)}
          </select>
        ) : (
          <input className="smu-input" placeholder="fx Jysk Lift Service ApS"
            value={firma} onChange={e => setFirma(e.target.value)} />
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <span className="smu-label">Resultat</span>
          <select className="smu-input" value={resultat} onChange={e => setResultat(e.target.value as EftersynResultat)}>
            {RESULTATER.map(r => <option key={r} value={r}>{EFTERSYN_RESULTAT_LABEL[r]}</option>)}
          </select>
        </div>
        <div>
          <span className="smu-label">Mærkatnummer (valgfrit)</span>
          <input className="smu-input" placeholder="fx 2025112074" value={maerkat} onChange={e => setMaerkat(e.target.value)} />
        </div>
      </div>

      <div>
        <span className="smu-label">Note (valgfrit)</span>
        <textarea className="smu-input min-h-[56px]" value={note} onChange={e => setNote(e.target.value)} />
      </div>

      {fejl && <p className="smu-error">{fejl}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className="smu-btn-success">
          {busy ? 'Gemmer…' : 'Gem eftersyn'}
        </button>
        <button type="button" onClick={onAnnuller} className="smu-btn-secondary">Annuller</button>
      </div>
    </form>
  )
}
