import { useAuth } from '../context/AuthContext'

// Placeholder-forside for scaffold-fasen. Det rigtige dashboard (handlingsliste:
// kritiske fund, forfaldne handlinger/eftersyn, åbne påbud) bygges i en senere
// fase jf. PROJECT_OVERVIEW.md §6. Ingen APV-funktioner her endnu.
const KOMMENDE_OMRAADER = [
  'Fund / observationer',
  'Handlinger',
  'Kemikalier',
  'Kemisk risikovurdering (KRV)',
  'Maskiner / eftersyn',
  'Påbud / myndighedskrav',
]

export default function Forside() {
  const { profil } = useAuth()
  const fornavn = profil?.fuldt_navn?.split(' ')[0] ?? null

  return (
    <div className="space-y-6">
      <div>
        <p className="smu-eyebrow">SMU APV</p>
        <h1 className="smu-page-title mt-1">
          {fornavn ? `Velkommen, ${fornavn}` : 'Velkommen'}
        </h1>
        <p className="smu-meta text-[13px] mt-2 max-w-xl">
          Signmeups arbejdsmiljøsystem. Det tekniske fundament er på plads —
          selve APV-funktionerne bygges i de kommende faser.
        </p>
      </div>

      <div className="smu-card p-6 max-w-xl">
        <p className="smu-eyebrow mb-3">Kommende områder</p>
        <ul className="space-y-2">
          {KOMMENDE_OMRAADER.map((navn) => (
            <li key={navn} className="flex items-center gap-2 text-[14px] font-semibold text-text">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
              {navn}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
