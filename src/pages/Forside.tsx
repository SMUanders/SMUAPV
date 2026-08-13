import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, FlaskConical, Wrench, Gavel, ShieldAlert, ClipboardList, ClipboardCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { hentKemikalier, hentMaskiner, hentFund, hentPaabud } from '../lib/apvApi'
import type { Kemikalie, Maskine, Fund, Paabud } from '../types/apv'

type ResultatType = 'kemikalie' | 'maskine' | 'fund' | 'paabud'
interface Resultat { type: ResultatType; id: string; titel: string; undertekst: string; til: string }

const TYPE_LABEL: Record<ResultatType, string> = {
  kemikalie: 'Kemikalie', maskine: 'Maskine', fund: 'APV-fund', paabud: 'Påbud',
}

export default function Forside() {
  const { profil } = useAuth()
  const fornavn = profil?.fuldt_navn?.split(' ')[0] ?? null
  const [kemikalier, setKemikalier] = useState<Kemikalie[]>([])
  const [maskiner, setMaskiner] = useState<Maskine[]>([])
  const [fund, setFund] = useState<Fund[]>([])
  const [paabud, setPaabud] = useState<Paabud[]>([])
  const [sog, setSog] = useState('')

  useEffect(() => {
    Promise.all([hentKemikalier(), hentMaskiner(), hentFund(), hentPaabud()])
      .then(([k, m, f, p]) => { setKemikalier(k); setMaskiner(m); setFund(f); setPaabud(p) })
      .catch(() => { /* opslag degraderer pænt — søgning viser blot færre resultater */ })
  }, [])

  const resultater = useMemo<Resultat[]>(() => {
    const q = sog.trim().toLowerCase()
    if (!q) return []
    const m = (arr: (string | null | undefined)[]) => arr.some(h => (h ?? '').toLowerCase().includes(q))
    const r: Resultat[] = []
    for (const k of kemikalier)
      if (m([k.produktnavn, k.leverandoer, k.anvendelse, k.ppe, ...k.h_saetninger]))
        r.push({ type: 'kemikalie', id: k.id, titel: k.produktnavn, undertekst: k.leverandoer ?? '', til: `/kemikalier/${k.id}` })
    for (const ma of maskiner)
      if (m([ma.navn, ma.serienr, ma.fabrikat_model, ma.type]))
        r.push({ type: 'maskine', id: ma.id, titel: ma.navn, undertekst: `${ma.fabrikat_model ?? ''} ${ma.serienr ?? ''}`.trim(), til: `/maskiner/${ma.id}` })
    for (const f of fund)
      if (m([f.titel, f.beskrivelse, f.kilde_aarsag, f.nuvaerende_foranstaltninger]))
        r.push({ type: 'fund', id: f.id, titel: f.titel, undertekst: '', til: `/fund/${f.id}` })
    for (const p of paabud)
      if (m([p.titel, p.type, p.myndighed]))
        r.push({ type: 'paabud', id: p.id, titel: p.titel, undertekst: p.myndighed, til: `/paabud/${p.id}` })
    return r
  }, [sog, kemikalier, maskiner, fund, paabud])

  return (
    <div className="space-y-6">
      <div className="text-center pt-2">
        <p className="smu-eyebrow">SMU APV</p>
        <h1 className="smu-page-title mt-1">{fornavn ? `Hej, ${fornavn}` : 'APV-opslag'}</h1>
        <p className="smu-meta text-[13px] mt-2">Find hurtigt kemikalier, maskiner, APV-forhold og påbud.</p>
      </div>

      {/* Stor søgning */}
      <div className="relative max-w-2xl mx-auto">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input autoFocus value={sog} onChange={e => setSog(e.target.value)}
          placeholder="Søg i APV — fx isopropanol, H319, Skyjack, serienummer, strakspåbud…"
          className="smu-input !pl-12 !py-3.5 !text-[15px] !rounded-[12px] shadow-sm" />
      </div>

      {/* Resultater */}
      {sog.trim() && (
        <div className="max-w-2xl mx-auto">
          {resultater.length === 0
            ? <p className="smu-meta text-[13px] text-center py-4">Ingen match på «{sog}».</p>
            : (
              <div className="space-y-2">
                <p className="smu-eyebrow">{resultater.length} resultat{resultater.length === 1 ? '' : 'er'}</p>
                {resultater.map(r => (
                  <Link key={`${r.type}-${r.id}`} to={r.til} className="smu-card smu-list-card block p-3.5 no-underline">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-extrabold text-navy truncate">{r.titel}</p>
                        {r.undertekst && <p className="smu-meta text-[12px] mt-0.5 truncate">{r.undertekst}</p>}
                      </div>
                      <span className="smu-badge smu-badge-grey shrink-0">{TYPE_LABEL[r.type]}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </div>
      )}

      {/* Indgange */}
      {!sog.trim() && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl mx-auto pt-2">
          <Indgang til="/dagligt-tjek" ikon={<ClipboardCheck size={20} />} navn="Dagligt lift-tjek" />
          <Indgang til="/kemikalier" ikon={<FlaskConical size={20} />} navn="Kemikalier" antal={kemikalier.length} />
          <Indgang til="/maskiner" ikon={<Wrench size={20} />} navn="Maskiner" antal={maskiner.length} />
          <Indgang til="/kemikalier" ikon={<ClipboardList size={20} />} navn="KRV / arbejdsinstrukser" />
          <Indgang til="/fund" ikon={<ShieldAlert size={20} />} navn="APV-forhold" antal={fund.length} />
          <Indgang til="/paabud" ikon={<Gavel size={20} />} navn="Påbud" antal={paabud.length} />
        </div>
      )}
    </div>
  )
}

function Indgang({ til, ikon, navn, antal }: { til: string; ikon: React.ReactNode; navn: string; antal?: number }) {
  return (
    <Link to={til} className="smu-card smu-list-card block p-5 no-underline text-center">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary-soft text-primary-deep mb-2">
        {ikon}
      </div>
      <p className="text-[14px] font-extrabold text-navy">{navn}</p>
      {antal != null && <p className="smu-meta text-[12px] mt-0.5">{antal} i alt</p>}
    </Link>
  )
}
