import { useState } from 'react'
import type { Dokument } from '../types/apv'
import { FileText, ExternalLink } from 'lucide-react'
import { signeretUrl } from '../lib/apvApi'

/** Label + kort værdi på én linje (til stamdata-lister). */
export function Raekke({ label, værdi }: { label: string; værdi: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border-soft last:border-0">
      <span className="smu-eyebrow pt-0.5">{label}</span>
      <span className="text-[13px] font-bold text-navy text-right">
        {værdi === '' || værdi == null ? <span className="text-text-muted font-normal">—</span> : værdi}
      </span>
    </div>
  )
}

/** Label + flerlinjet fritekst. */
export function Afsnit({ label, tekst }: { label: string; tekst: string | null | undefined }) {
  return (
    <div>
      <span className="smu-label">{label}</span>
      <p className="text-[14px] font-semibold text-text whitespace-pre-wrap">
        {tekst?.trim() ? tekst : <span className="text-text-muted font-normal">—</span>}
      </p>
    </div>
  )
}

/** Liste af værdier som chips (fx H-sætninger). */
export function Etiketter({ label, vaerdier, variant = 'grey', tom = 'Ingen data' }: {
  label: string; vaerdier: string[]; variant?: 'grey' | 'orange'; tom?: string
}) {
  return (
    <div>
      <span className="smu-label">{label}</span>
      {vaerdier.length === 0
        ? <p className="smu-meta text-[13px]">{tom}</p>
        : (
          <div className="flex flex-wrap gap-1.5">
            {vaerdier.map((v, i) => (
              <span key={i} className={`smu-badge smu-badge-${variant} !text-[11px] normal-case`}>{v}</span>
            ))}
          </div>
        )}
    </div>
  )
}

/** Har dokumentet en brugbar kilde (offentligt link eller privat bucket+path)? */
function harKilde(d: Dokument): boolean {
  return !!d.url || !!(d.bucket && d.path)
}

/** Læsbar label — aldrig en rå URL som primær tekst. */
function dokumentLabel(d: Dokument): string {
  if (d.navn && d.navn.trim()) return d.navn.trim()
  const sti = d.path || d.url || ''
  const fil = decodeURIComponent(sti.split('?')[0].split('/').pop() ?? '')
  return fil || 'Dokument'
}

/** Dokumentreferencer. Robust visning: dokumentet åbnes altid i en NY FANE
 *  (browserens egen, stabile visning) — ingen indlejret preview. Offentlige/
 *  eksterne links er rigtige <a>; private Storage-objekter åbnes via signeret
 *  URL (fane åbnes synkront for at undgå popup-blokering, og redirectes bagefter). */
export function Dokumenter({ dokumenter }: { dokumenter: Dokument[] }) {
  const [henterId, setHenterId] = useState<number | null>(null)
  const [fejlId, setFejlId] = useState<number | null>(null)

  if (!dokumenter || dokumenter.length === 0)
    return <p className="smu-meta text-[13px]">Ingen dokumenter tilknyttet.</p>

  async function aabnPrivat(d: Dokument, i: number) {
    const win = window.open('', '_blank')      // åbnes synkront (bevarer bruger-gesten)
    if (win) win.opener = null
    setHenterId(i); setFejlId(null)
    try {
      const url = await signeretUrl(d.bucket!, d.path!)
      if (win) win.location.href = url
      else window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      if (win) win.close()
      setFejlId(i)
    } finally {
      setHenterId(null)
    }
  }

  return (
    <ul className="space-y-1.5">
      {dokumenter.map((d, i) => {
        if (!harKilde(d)) {
          return (
            <li key={i} className="flex items-center gap-2 text-[13px]">
              <FileText size={14} className="text-text-muted shrink-0" />
              <span className="smu-meta">
                {dokumentLabel(d)} — <span className="font-bold text-orange-deep">dokument mangler</span>
              </span>
            </li>
          )
        }
        return (
          <li key={i} className="flex items-center gap-2 text-[13px]">
            <FileText size={14} className="text-text-muted shrink-0" />
            {d.url ? (
              <a href={d.url} target="_blank" rel="noopener noreferrer"
                className="smu-link inline-flex items-center gap-1">
                {dokumentLabel(d)} <ExternalLink size={12} className="shrink-0" />
              </a>
            ) : (
              <button type="button" onClick={() => aabnPrivat(d, i)} disabled={henterId === i}
                className="smu-link text-left inline-flex items-center gap-1 disabled:opacity-60">
                {dokumentLabel(d)} <ExternalLink size={12} className="shrink-0" />
                {henterId === i && <span className="smu-meta ml-1">åbner…</span>}
                {fejlId === i && <span className="smu-error ml-1">kunne ikke åbne</span>}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
