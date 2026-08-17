import { Link } from 'react-router-dom'
import { Wrench, ClipboardCheck, ChevronRight } from 'lucide-react'
import type { Maskine } from '../types/apv'
import { MASKINE_STATUS_LABEL, maskineStatusBadge } from '../types/apv'
import type { SenesteTjek } from '../lib/apvApi'
import { dkDato, dkDatoTid } from '../lib/format'

/** Badge for seneste daglige tjek (delt statussprog). */
function TjekBadge({ t }: { t: SenesteTjek | null }) {
  if (!t) return <span className="smu-badge smu-badge-grey">Ikke tjekket endnu</span>
  return (
    <span className={t.status === 'fejl' ? 'smu-badge smu-badge-red' : 'smu-badge smu-badge-green'}>
      {t.status === 'fejl' ? 'Fejl' : 'Godkendt'}
    </span>
  )
}

/**
 * Fælles lift-/maskinekort. Samme typografi, metadata-hierarki, badges og
 * spacing begge steder — men to formål:
 *  - variant 'tjek'     → handlingsorienteret (starter dagligt tjek).
 *  - variant 'register' → opslag (åbner maskinens detaljeside).
 */
export default function LiftKort({ maskine: m, senesteTjek, variant }: {
  maskine: Maskine
  senesteTjek: SenesteTjek | null
  variant: 'tjek' | 'register'
}) {
  const fejl = senesteTjek?.status === 'fejl'
  const til = variant === 'tjek' ? `/maskiner/${m.id}/dagligt-tjek` : `/maskiner/${m.id}`

  return (
    <Link to={til}
      className={`smu-card smu-list-card block p-4 no-underline ${fejl ? 'border-l-4 border-l-[#b53b3b]' : ''}`}>
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
                <p className="smu-meta text-[12px] mt-0.5">
                  Næste eftersyn: {m.naeste_eftersyn ? dkDato(m.naeste_eftersyn) : '—'}
                </p>
                <p className="smu-meta text-[12px] mt-0.5">
                  Seneste daglige tjek: {senesteTjek
                    ? `${dkDato(senesteTjek.created_at)} · ${senesteTjek.status === 'fejl' ? 'Fejl' : 'Godkendt'}`
                    : '—'}
                </p>
              </>
            )}
          </div>
        </div>
        <span className="shrink-0">
          {variant === 'tjek'
            ? <TjekBadge t={senesteTjek} />
            : <span className={maskineStatusBadge(m.status)}>{MASKINE_STATUS_LABEL[m.status]}</span>}
        </span>
      </div>

      {variant === 'tjek' && (
        <div className="mt-3 pt-3 border-t border-border-soft flex items-center justify-between gap-3">
          <p className="smu-meta text-[12px] min-w-0 truncate">
            {senesteTjek
              ? `Seneste: ${dkDatoTid(senesteTjek.created_at)}${senesteTjek.udfoert_af_navn ? ' · ' + senesteTjek.udfoert_af_navn : ''}`
              : 'Endnu ingen tjek udført'}
          </p>
          <span className="smu-btn-primary inline-flex items-center gap-1.5 shrink-0">
            Start dagligt tjek <ChevronRight size={14} />
          </span>
        </div>
      )}
    </Link>
  )
}
