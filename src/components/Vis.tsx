import { useEffect, useState } from 'react'
import type { Dokument } from '../types/apv'
import { FileText, X } from 'lucide-react'
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

/** Er dokumentet en PDF vi selv kan vise indlejret? (Storage-privat = altid PDF; ellers .pdf-endelse.) */
function erPdf(d: Dokument): boolean {
  if (d.bucket && d.path) return true
  if (d.url) return d.url.toLowerCase().split('?')[0].endsWith('.pdf')
  return false
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

/** Dokumentreferencer. PDF'er vises indlejret i appen (uanset browserens
 *  download-indstilling); private hentes via signeret URL. Ikke-PDF-links
 *  (fx fotoalbum) åbnes i ny fane. */
export function Dokumenter({ dokumenter }: { dokumenter: Dokument[] }) {
  const [aktiv, setAktiv] = useState<{ navn: string; url: string } | null>(null)
  const [henterId, setHenterId] = useState<number | null>(null)
  const [fejlId, setFejlId] = useState<number | null>(null)

  if (!dokumenter || dokumenter.length === 0)
    return <p className="smu-meta text-[13px]">Ingen dokumenter tilknyttet.</p>

  async function aabn(d: Dokument, i: number) {
    let url = d.url ?? null
    if (!url && d.bucket && d.path) {
      setHenterId(i); setFejlId(null)
      try {
        url = await signeretUrl(d.bucket, d.path)
      } catch {
        setFejlId(i); setHenterId(null); return
      }
      setHenterId(null)
    }
    if (!url) return
    if (erPdf(d)) setAktiv({ navn: d.navn || 'Dokument', url })
    else window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <ul className="space-y-1.5">
        {dokumenter.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-[13px]">
            <FileText size={14} className="text-text-muted shrink-0" />
            {harKilde(d) ? (
              <button type="button" onClick={() => aabn(d, i)} disabled={henterId === i}
                className="smu-link text-left disabled:opacity-60">
                {dokumentLabel(d)}{henterId === i ? ' …' : ''}
                {fejlId === i && <span className="smu-error ml-1">kunne ikke åbne</span>}
              </button>
            ) : (
              <span className="smu-meta">
                {dokumentLabel(d)} — <span className="font-bold text-orange-deep">dokument mangler</span>
              </span>
            )}
          </li>
        ))}
      </ul>
      {aktiv && <DokumentVis navn={aktiv.navn} url={aktiv.url} onLuk={() => setAktiv(null)} />}
    </>
  )
}

/** Indlejret PDF-fremviser (fuldskærms-overlay). Viser altid inline. */
function DokumentVis({ navn, url, onLuk }: { navn: string; url: string; onLuk: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onLuk() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onLuk])

  return (
    <div className="fixed inset-0 z-50 bg-navy/60 flex flex-col p-3 sm:p-6" onClick={onLuk}>
      <div className="smu-card flex flex-col flex-1 min-h-0 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border">
          <p className="text-[14px] font-extrabold text-navy truncate">{navn}</p>
          <div className="flex items-center gap-2 shrink-0">
            <a href={url} target="_blank" rel="noreferrer" className="smu-btn-secondary">Åbn i ny fane</a>
            <button type="button" onClick={onLuk} className="smu-btn-secondary px-2" aria-label="Luk">
              <X size={16} />
            </button>
          </div>
        </div>
        <iframe src={url} title={navn} className="flex-1 w-full border-0" />
      </div>
    </div>
  )
}
