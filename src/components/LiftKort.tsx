import { Link } from 'react-router-dom'
import { Wrench, ClipboardCheck, ChevronRight } from 'lucide-react'
import type { Maskine } from '../types/apv'
import { MASKINE_STATUS_LABEL, maskineStatusBadge } from '../types/apv'
import type { SenesteTjek } from '../lib/apvApi'
import { dkDato, dkTid, erFortid, kontrolStatus, type KontrolStatus } from '../lib/format'

/**
 * Fælles lift-/maskinekort. Holder de TRE forhold adskilt:
 *   A) maskinens grundstatus (kun vist når den ikke er 'ok'),
 *   B) periodisk eftersyn (egen linje; "Forfaldet" hvis næste eftersyn er i fortiden),
 *   C) kontrol før brug (gælder I DAG; "Ikke kontrolleret i dag" er neutral).
 * Ingen samlet grøn "OK"-badge, der kan misforstås som "klar til brug".
 */

/** Badge for kontrol før brug (i dag). */
function KontrolBadge({ ks }: { ks: KontrolStatus }) {
  if (ks === 'fejl') return <span className="smu-badge smu-badge-red">Fejl – må ikke anvendes</span>
  if (ks === 'godkendt') return <span className="smu-badge smu-badge-green">Godkendt</span>
  return <span className="smu-badge smu-badge-grey">Ikke kontrolleret i dag</span>
}

function kontrolTekst(ks: KontrolStatus, t: SenesteTjek | null): string {
  if (ks === 'fejl') return 'Fejl – må ikke anvendes'
  if (ks === 'godkendt' && t) return `Godkendt kl. ${dkTid(t.created_at)}${t.udfoert_af_navn ? ' · ' + t.udfoert_af_navn : ''}`
  return 'Ikke kontrolleret i dag'
}

export default function LiftKort({ maskine: m, senesteTjek, variant }: {
  maskine: Maskine
  senesteTjek: SenesteTjek | null
  variant: 'tjek' | 'register'
}) {
  const ks = kontrolStatus(senesteTjek)
  const eftersynForfaldet = erFortid(m.naeste_eftersyn)
  const til = variant === 'tjek' ? `/maskiner/${m.id}/dagligt-tjek` : `/maskiner/${m.id}`

  return (
    <Link to={til}
      className={`smu-card smu-list-card block p-4 no-underline ${ks === 'fejl' ? 'border-l-4 border-l-[#b53b3b]' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {variant === 'tjek'
            ? <ClipboardCheck size={18} className="text-primary shrink-0 mt-0.5" />
            : <Wrench size={18} className="text-primary shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold text-navy truncate">{m.navn}</p>
            <p className="smu-meta text-[12px] mt-0.5">{m.fabrikat_model ?? m.type ?? '—'}</p>
            <p className="smu-meta text-[12px] mt-0.5">{m.serienr ?? '—'}</p>

            {variant === 'register' && (
              <>
                <p className="smu-meta text-[12px] mt-1.5">
                  Periodisk eftersyn:{' '}
                  {m.naeste_eftersyn
                    ? (eftersynForfaldet
                        ? <span className="font-bold text-orange-deep">Forfaldet ({dkDato(m.naeste_eftersyn)})</span>
                        : dkDato(m.naeste_eftersyn))
                    : 'ikke registreret'}
                </p>
                <p className="smu-meta text-[12px] mt-0.5">
                  Kontrol før brug:{' '}
                  <span className={ks === 'fejl' ? 'font-bold text-[#b53b3b]' : 'font-semibold'}>
                    {kontrolTekst(ks, senesteTjek)}
                  </span>
                </p>
              </>
            )}
          </div>
        </div>
        <span className="shrink-0 flex flex-col items-end gap-1">
          <KontrolBadge ks={ks} />
          {m.status !== 'ok' && (
            <span className={maskineStatusBadge(m.status)}>{MASKINE_STATUS_LABEL[m.status]}</span>
          )}
        </span>
      </div>

      {variant === 'tjek' && (
        <div className="mt-3 pt-3 border-t border-border-soft flex items-center justify-between gap-3">
          <p className="smu-meta text-[12px] min-w-0 truncate">
            {ks === 'ikke_i_dag'
              ? (senesteTjek ? `Seneste kontrol: ${dkDato(senesteTjek.created_at)}` : 'Endnu ingen kontrol udført')
              : kontrolTekst(ks, senesteTjek)}
          </p>
          <span className="smu-btn-primary inline-flex items-center gap-1.5 shrink-0">
            Start kontrol før brug <ChevronRight size={14} />
          </span>
        </div>
      )}
    </Link>
  )
}
