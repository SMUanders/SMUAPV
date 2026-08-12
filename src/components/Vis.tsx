import type { Dokument } from '../types/apv'
import { FileText } from 'lucide-react'

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

/** Dokumentreferencer (navn + evt. link). */
export function Dokumenter({ dokumenter }: { dokumenter: Dokument[] }) {
  if (!dokumenter || dokumenter.length === 0)
    return <p className="smu-meta text-[13px]">Ingen dokumenter tilknyttet.</p>
  return (
    <ul className="space-y-1.5">
      {dokumenter.map((d, i) => (
        <li key={i} className="flex items-center gap-2 text-[13px]">
          <FileText size={14} className="text-text-muted shrink-0" />
          {d.url
            ? <a href={d.url} target="_blank" rel="noreferrer" className="smu-link">{d.navn || d.url}</a>
            : <span className="font-semibold text-text">{d.navn}</span>}
        </li>
      ))}
    </ul>
  )
}
