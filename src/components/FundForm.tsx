import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { FundPayload, FundStatus, Omraade } from '../types/apv'
import { FUND_STATUS_LABEL } from '../types/apv'
import type { PersonKort } from '../lib/apvApi'

interface Props {
  initial: FundPayload
  omraader: Omraade[]
  personer: PersonKort[]
  submitLabel: string
  busy: boolean
  onSubmit: (payload: FundPayload, begrundelse: string) => void
  onAnnuller: () => void
}

const STATUS_VALG: FundStatus[] = ['ny', 'i_gang', 'loest', 'risiko_accepteret', 'lukket']

// Ren visning af score (alvor × sandsynlighed). Risikoniveauet vises IKKE her —
// det udledes autoritativt i databasen (apv_fund_beriget), når fundet er gældende.
function score(a: number | null, s: number | null): number | null {
  return a != null && s != null ? a * s : null
}

export default function FundForm({ initial, omraader, personer, submitLabel, busy, onSubmit, onAnnuller }: Props) {
  const [p, setP] = useState<FundPayload>(initial)
  const [begrundelse, setBegrundelse] = useState('')
  const [fejl, setFejl] = useState('')

  function sæt<K extends keyof FundPayload>(key: K, val: FundPayload[K]) {
    setP(prev => ({ ...prev, [key]: val }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!p.titel.trim()) { setFejl('Titel er påkrævet.'); return }
    setFejl('')
    onSubmit(p, begrundelse.trim())
  }

  const s = score(p.alvor, p.sandsynlighed)
  const sEfter = score(p.alvor_efter, p.sandsynlighed_efter)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="smu-card p-5 space-y-4">
        <Felt label="Titel">
          <input className="smu-input" value={p.titel} autoFocus
            onChange={e => sæt('titel', e.target.value)} placeholder="Kort overskrift på fundet" />
        </Felt>

        <div className="grid sm:grid-cols-2 gap-4">
          <Felt label="Område">
            <select className="smu-input" value={p.omraade_id ?? ''}
              onChange={e => sæt('omraade_id', e.target.value || null)}>
              <option value="">— Vælg område —</option>
              {omraader.map(o => <option key={o.id} value={o.id}>{o.navn}</option>)}
            </select>
          </Felt>
          <Felt label="Ansvarlig">
            <select className="smu-input" value={p.ansvarlig_id ?? ''}
              onChange={e => sæt('ansvarlig_id', e.target.value || null)}>
              <option value="">— Vælg ansvarlig —</option>
              {personer.map(pe => <option key={pe.id} value={pe.id}>{pe.fuldt_navn ?? 'Unavngivet'}</option>)}
            </select>
          </Felt>
        </div>

        <Felt label="Beskrivelse (problem/risiko)">
          <textarea className="smu-input min-h-[80px]" value={p.beskrivelse ?? ''}
            onChange={e => sæt('beskrivelse', e.target.value)} />
        </Felt>

        <Felt label="Kilde / årsag">
          <textarea className="smu-input min-h-[60px]" value={p.kilde_aarsag ?? ''}
            onChange={e => sæt('kilde_aarsag', e.target.value)} />
        </Felt>

        <Felt label="Særlige grupper (gravide, unge under 18 …)">
          <input className="smu-input" value={p.saerlige_grupper ?? ''}
            onChange={e => sæt('saerlige_grupper', e.target.value)} />
        </Felt>
      </div>

      {/* Risikovurdering */}
      <div className="smu-card p-5 space-y-4">
        <p className="smu-eyebrow">Risikovurdering</p>
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <SkalaFelt label="Alvorlighed (1–5)" value={p.alvor} onChange={v => sæt('alvor', v)} />
          <SkalaFelt label="Sandsynlighed (1–5)" value={p.sandsynlighed} onChange={v => sæt('sandsynlighed', v)} />
          <div>
            <span className="smu-label">Score (beregnet)</span>
            <div className="smu-input bg-row-bg flex items-center font-extrabold">
              {s ?? '—'}
            </div>
          </div>
        </div>
        <p className="smu-meta text-[11px]">
          Risikoniveauet beregnes i databasen, når fundet er gældende — det vises på fund-siden.
        </p>
      </div>

      {/* Restrisiko efter tiltag */}
      <div className="smu-card p-5 space-y-4">
        <p className="smu-eyebrow">Restrisiko efter tiltag (valgfri)</p>
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <SkalaFelt label="Alvorlighed efter" value={p.alvor_efter} onChange={v => sæt('alvor_efter', v)} />
          <SkalaFelt label="Sandsynlighed efter" value={p.sandsynlighed_efter} onChange={v => sæt('sandsynlighed_efter', v)} />
          <div>
            <span className="smu-label">Score efter (beregnet)</span>
            <div className="smu-input bg-row-bg flex items-center font-extrabold">
              {sEfter ?? '—'}
            </div>
          </div>
        </div>
        <Felt label="Nuværende foranstaltninger">
          <textarea className="smu-input min-h-[60px]" value={p.nuvaerende_foranstaltninger ?? ''}
            onChange={e => sæt('nuvaerende_foranstaltninger', e.target.value)} />
        </Felt>
      </div>

      {/* Styring */}
      <div className="smu-card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Felt label="Status">
            <select className="smu-input" value={p.status}
              onChange={e => sæt('status', e.target.value as FundStatus)}>
              {STATUS_VALG.map(st => <option key={st} value={st}>{FUND_STATUS_LABEL[st]}</option>)}
            </select>
          </Felt>
          <Felt label="Deadline">
            <input type="date" className="smu-input" value={p.deadline ?? ''}
              onChange={e => sæt('deadline', e.target.value || null)} />
          </Felt>
        </div>

        <DokumentFelter dokumenter={p.dokumenter} onChange={d => sæt('dokumenter', d)} />
      </div>

      {/* Begrundelse for forslaget */}
      <div className="smu-card p-5">
        <Felt label="Begrundelse for forslaget (vises til admin)">
          <textarea className="smu-input min-h-[60px]" value={begrundelse}
            onChange={e => setBegrundelse(e.target.value)}
            placeholder="Kort: hvorfor foreslår du det her?" />
        </Felt>
      </div>

      {fejl && <p className="smu-error">{fejl}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="smu-btn-primary">
          {busy ? 'Sender…' : submitLabel}
        </button>
        <button type="button" onClick={onAnnuller} className="smu-btn-secondary">Annuller</button>
      </div>
    </form>
  )
}

function Felt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="smu-label">{label}</span>
      {children}
    </div>
  )
}

function SkalaFelt({ label, value, onChange }: {
  label: string; value: number | null; onChange: (v: number | null) => void
}) {
  return (
    <Felt label={label}>
      <select className="smu-input" value={value ?? ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">—</option>
        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </Felt>
  )
}

function DokumentFelter({ dokumenter, onChange }: {
  dokumenter: { navn: string; url: string }[]
  onChange: (d: { navn: string; url: string }[]) => void
}) {
  function opdater(i: number, felt: 'navn' | 'url', val: string) {
    onChange(dokumenter.map((d, idx) => idx === i ? { ...d, [felt]: val } : d))
  }
  return (
    <div>
      <span className="smu-label">Dokumentreferencer (navn + link/sti — fil-upload kommer senere)</span>
      <div className="space-y-2">
        {dokumenter.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input className="smu-input flex-1" placeholder="Navn" value={d.navn}
              onChange={e => opdater(i, 'navn', e.target.value)} />
            <input className="smu-input flex-1" placeholder="Link eller sti" value={d.url}
              onChange={e => opdater(i, 'url', e.target.value)} />
            <button type="button" title="Fjern"
              onClick={() => onChange(dokumenter.filter((_, idx) => idx !== i))}
              className="smu-btn-secondary px-2 shrink-0">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...dokumenter, { navn: '', url: '' }])}
          className="smu-btn-ghost inline-flex items-center gap-1">
          <Plus size={14} /> Tilføj dokumentreference
        </button>
      </div>
    </div>
  )
}
