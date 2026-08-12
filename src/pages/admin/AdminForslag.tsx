import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertTriangle, Check, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  erAdmin, FUND_FELT_LABEL, FUND_STATUS_LABEL,
  type Forslag, type Fund, type FundPayload, type FundStatus,
} from '../../types/apv'
import {
  hentAfventendeForslag, hentFund, hentOmraader, hentPersoner,
  godkendForslag, afvisForslag, type PersonKort,
} from '../../lib/apvApi'
import { dkDato, dkDatoTid } from '../../lib/format'

const FUND_KEYS = Object.keys(FUND_FELT_LABEL) as (keyof FundPayload)[]

export default function AdminForslag() {
  const { profil, loading: authLoading } = useAuth()
  const [forslag, setForslag] = useState<Forslag[]>([])
  const [fund, setFund] = useState<Fund[]>([])
  const [omraader, setOmraader] = useState<{ id: string; navn: string }[]>([])
  const [personer, setPersoner] = useState<PersonKort[]>([])
  const [loading, setLoading] = useState(true)
  const [fejl, setFejl] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    Promise.all([hentAfventendeForslag(), hentFund(), hentOmraader(), hentPersoner()])
      .then(([f, funds, o, p]) => { setForslag(f); setFund(funds); setOmraader(o); setPersoner(p); setFejl('') })
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente forslag.'))
      .finally(() => setLoading(false))
  }, [tick])
  const genindlæs = () => setTick(t => t + 1)

  const omraadeNavn = useMemo(
    () => Object.fromEntries(omraader.map(o => [o.id, o.navn])), [omraader])
  const personNavn = useMemo(
    () => Object.fromEntries(personer.map(p => [p.id, p.fuldt_navn ?? 'Unavngivet'])), [personer])
  const fundMap = useMemo(
    () => Object.fromEntries(fund.map(f => [f.id, f])), [fund])

  if (authLoading) return <p className="smu-meta text-sm">Indlæser…</p>
  if (!erAdmin(profil)) return <Navigate to="/" replace />

  return (
    <div className="space-y-5">
      <div>
        <p className="smu-eyebrow">Admin</p>
        <h1 className="smu-page-title mt-1">Forslag-indbakke</h1>
        <p className="smu-meta text-[13px] mt-2">Afventende forslag. Godkendelse gør ændringen gældende.</p>
      </div>

      {fejl && <div className="smu-notice smu-notice-warn"><AlertTriangle size={15} />{fejl}</div>}
      {loading && <p className="smu-meta text-sm">Indlæser…</p>}

      {!loading && !fejl && forslag.length === 0 && (
        <div className="smu-card p-8 text-center">
          <p className="text-[15px] font-bold text-navy mb-1">Ingen afventende forslag</p>
          <p className="smu-meta text-[13px]">Alt er behandlet.</p>
        </div>
      )}

      <div className="space-y-3">
        {forslag.map(f => (
          <ForslagKort key={f.id} forslag={f}
            fund={f.maal_id ? fundMap[f.maal_id] ?? null : null}
            omraadeNavn={omraadeNavn} personNavn={personNavn}
            onBehandlet={genindlæs} />
        ))}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────

function ForslagKort({ forslag, fund, omraadeNavn, personNavn, onBehandlet }: {
  forslag: Forslag
  fund: Fund | null
  omraadeNavn: Record<string, string>
  personNavn: Record<string, string>
  onBehandlet: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [afvisMode, setAfvisMode] = useState(false)
  const [note, setNote] = useState('')
  const [fejl, setFejl] = useState('')

  const erFund = forslag.entitet === 'fund'

  async function godkend() {
    setBusy(true); setFejl('')
    try { await godkendForslag(forslag.id); onBehandlet() }
    catch (e) { setFejl((e as Error).message ?? 'Kunne ikke godkende.'); setBusy(false) }
  }
  async function afvis() {
    setBusy(true); setFejl('')
    try { await afvisForslag(forslag.id, note.trim() || null); onBehandlet() }
    catch (e) { setFejl((e as Error).message ?? 'Kunne ikke afvise.'); setBusy(false) }
  }

  return (
    <div className="smu-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[14px] font-extrabold text-navy">
            {overskrift(forslag)}
          </p>
          <p className="smu-meta text-[12px] mt-0.5">
            {forslag.created_by_navn ?? 'Ukendt'} · {dkDatoTid(forslag.created_at)}
          </p>
        </div>
        <span className="smu-badge smu-badge-orange">Afventer</span>
      </div>

      {forslag.begrundelse && (
        <p className="text-[13px] font-semibold text-text bg-row-bg rounded-lg px-3 py-2 mb-3">
          «{forslag.begrundelse}»
        </p>
      )}

      {/* Detalje */}
      {erFund && forslag.operation === 'opret' && (
        <FundVisning payload={forslag.payload} omraadeNavn={omraadeNavn} personNavn={personNavn} />
      )}
      {erFund && forslag.operation === 'ret' && (
        <FundDiff payload={forslag.payload} fund={fund}
          omraadeNavn={omraadeNavn} personNavn={personNavn} />
      )}
      {erFund && forslag.operation === 'slet' && (
        <div className="smu-notice smu-notice-warn">
          <AlertTriangle size={15} />
          Godkendelse markerer fundet «{fund?.titel ?? forslag.maal_id}» som slettet.
        </div>
      )}
      {!erFund && (
        <p className="smu-meta text-[13px]">
          Entiteten «{forslag.entitet}» håndteres i en senere fase. Payload: <code>{JSON.stringify(forslag.payload)}</code>
        </p>
      )}

      {fejl && <p className="smu-error mt-3">{fejl}</p>}

      {/* Handlinger */}
      <div className="mt-4 pt-4 border-t border-border-soft">
        {!afvisMode ? (
          <div className="flex items-center gap-2">
            <button onClick={godkend} disabled={busy} className="smu-btn-success inline-flex items-center gap-1.5">
              <Check size={15} /> {busy ? 'Arbejder…' : 'Godkend'}
            </button>
            <button onClick={() => setAfvisMode(true)} disabled={busy}
              className="smu-btn-secondary inline-flex items-center gap-1.5">
              <X size={15} /> Afvis
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <span className="smu-label">Begrundelse for afvisning (valgfri)</span>
            <textarea className="smu-input min-h-[56px]" value={note}
              onChange={e => setNote(e.target.value)} placeholder="Hvorfor afvises forslaget?" />
            <div className="flex items-center gap-2">
              <button onClick={afvis} disabled={busy} className="smu-btn-secondary inline-flex items-center gap-1.5">
                <X size={15} /> {busy ? 'Arbejder…' : 'Bekræft afvisning'}
              </button>
              <button onClick={() => setAfvisMode(false)} disabled={busy} className="smu-btn-ghost">Fortryd</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function overskrift(f: Forslag): string {
  const op = f.operation === 'opret' ? 'Nyt fund' : f.operation === 'ret' ? 'Ændring af fund' : 'Sletning af fund'
  const titel = typeof f.payload?.titel === 'string' ? f.payload.titel : null
  if (f.entitet !== 'fund') return `${f.operation} · ${f.entitet}`
  return titel ? `${op} — ${titel}` : op
}

// Hele det foreslåede fund (opret).
function FundVisning({ payload, omraadeNavn, personNavn }: {
  payload: Record<string, unknown>
  omraadeNavn: Record<string, string>
  personNavn: Record<string, string>
}) {
  return (
    <div className="space-y-1">
      {FUND_KEYS.map(k => (
        <div key={k} className="flex items-start justify-between gap-3 py-1 border-b border-border-soft last:border-0">
          <span className="smu-eyebrow pt-0.5">{FUND_FELT_LABEL[k]}</span>
          <span className="text-[13px] font-bold text-navy text-right">
            {visVaerdi(k, payload[k], omraadeNavn, personNavn)}
          </span>
        </div>
      ))}
    </div>
  )
}

// Diff mellem nuværende fund og foreslåede værdier (ret).
function FundDiff({ payload, fund, omraadeNavn, personNavn }: {
  payload: Record<string, unknown>
  fund: Fund | null
  omraadeNavn: Record<string, string>
  personNavn: Record<string, string>
}) {
  if (!fund) {
    return <div className="smu-notice smu-notice-warn"><AlertTriangle size={15} />Kunne ikke finde det oprindelige fund.</div>
  }
  const ændrede = FUND_KEYS.filter(k => erForskellig(k, payload[k], fund))
  return (
    <div>
      {ændrede.length === 0 && (
        <p className="smu-meta text-[13px] mb-2">Forslaget indeholder ingen ændringer i forhold til nuværende fund.</p>
      )}
      <div className="space-y-2">
        {FUND_KEYS.map(k => {
          const ændret = erForskellig(k, payload[k], fund)
          return (
            <div key={k} className={`rounded-lg px-3 py-2 ${ændret ? 'bg-primary-soft' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="smu-eyebrow">{FUND_FELT_LABEL[k]}</span>
                {ændret && <span className="smu-badge smu-badge-orange">Ændret</span>}
              </div>
              {ændret ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Nuværende</p>
                    <p className="text-[13px] font-semibold text-text">{visFundVaerdi(k, fund, omraadeNavn, personNavn)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Foreslået</p>
                    <p className="text-[13px] font-bold text-navy">{visVaerdi(k, payload[k], omraadeNavn, personNavn)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] font-semibold text-text">{visFundVaerdi(k, fund, omraadeNavn, personNavn)}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── værdi-formatering + sammenligning ───

function norm(v: unknown): unknown {
  return v === '' || v === undefined ? null : v
}

function erForskellig(key: keyof FundPayload, payloadVal: unknown, fund: Fund): boolean {
  const a = norm(payloadVal)
  const b = norm((fund as unknown as Record<string, unknown>)[key])
  if (key === 'dokumenter') return JSON.stringify(a ?? []) !== JSON.stringify(b ?? [])
  return a !== b
}

function visVaerdi(
  key: keyof FundPayload, val: unknown,
  omraadeNavn: Record<string, string>, personNavn: Record<string, string>,
): string {
  if (val == null || val === '') return '—'
  switch (key) {
    case 'omraade_id': return omraadeNavn[String(val)] ?? '—'
    case 'ansvarlig_id': return personNavn[String(val)] ?? '—'
    case 'status': return FUND_STATUS_LABEL[val as FundStatus] ?? String(val)
    case 'deadline': return dkDato(String(val))
    case 'dokumenter': {
      const arr = Array.isArray(val) ? val as { navn?: string; url?: string }[] : []
      return arr.length ? arr.map(d => d.navn || d.url || '').join(', ') : '—'
    }
    default: return String(val)
  }
}

function visFundVaerdi(
  key: keyof FundPayload, fund: Fund,
  omraadeNavn: Record<string, string>, personNavn: Record<string, string>,
): string {
  return visVaerdi(key, (fund as unknown as Record<string, unknown>)[key], omraadeNavn, personNavn)
}
