import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import FundForm from '../components/FundForm'
import {
  hentFundEnkelt, hentOmraader, hentPersoner, opretForslag, fundPayloadTilJson, type PersonKort,
} from '../lib/apvApi'
import type { Fund, FundPayload, Omraade } from '../types/apv'

function tilPayload(f: Fund): FundPayload {
  return {
    omraade_id: f.omraade_id, titel: f.titel, beskrivelse: f.beskrivelse,
    kilde_aarsag: f.kilde_aarsag, saerlige_grupper: f.saerlige_grupper,
    alvor: f.alvor, sandsynlighed: f.sandsynlighed,
    alvor_efter: f.alvor_efter, sandsynlighed_efter: f.sandsynlighed_efter,
    nuvaerende_foranstaltninger: f.nuvaerende_foranstaltninger,
    ansvarlig_id: f.ansvarlig_id, status: f.status, deadline: f.deadline,
    dokumenter: f.dokumenter ?? [],
  }
}

export default function ForeslaaAendring() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [initial, setInitial] = useState<FundPayload | null>(null)
  const [omraader, setOmraader] = useState<Omraade[]>([])
  const [personer, setPersoner] = useState<PersonKort[]>([])
  const [busy, setBusy] = useState(false)
  const [fejl, setFejl] = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([hentFundEnkelt(id), hentOmraader(), hentPersoner()])
      .then(([f, o, p]) => {
        if (!f) { setFejl('Fundet findes ikke.'); return }
        setInitial(tilPayload(f)); setOmraader(o); setPersoner(p)
      })
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente fundet.'))
  }, [id])

  async function submit(payload: FundPayload, begrundelse: string) {
    if (!id) return
    setBusy(true); setFejl('')
    try {
      await opretForslag({
        entitet: 'fund', operation: 'ret', maal_id: id,
        payload: fundPayloadTilJson(payload), begrundelse: begrundelse || null,
      })
      navigate(`/fund/${id}`)
    } catch (e) {
      setFejl((e as Error).message ?? 'Kunne ikke sende forslaget.')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <Link to={`/fund/${id}`} className="smu-btn-ghost inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Tilbage til fundet
      </Link>
      <div>
        <p className="smu-eyebrow">Forslag · ændring</p>
        <h1 className="smu-h1 mt-1">Foreslå ændring</h1>
        <p className="smu-meta text-[13px] mt-2">
          Felterne starter med fundets nuværende værdier. Fundet ændres først, når en admin godkender forslaget.
        </p>
      </div>
      {fejl && <div className="smu-notice smu-notice-warn"><AlertTriangle size={15} />{fejl}</div>}
      {initial && (
        <FundForm initial={initial} omraader={omraader} personer={personer}
          submitLabel="Send ændringsforslag" busy={busy}
          onSubmit={submit} onAnnuller={() => navigate(`/fund/${id}`)} />
      )}
    </div>
  )
}
