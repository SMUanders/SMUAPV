import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import FundForm from '../components/FundForm'
import { hentOmraader, hentPersoner, opretForslag, fundPayloadTilJson, type PersonKort } from '../lib/apvApi'
import type { FundPayload, Omraade } from '../types/apv'

const TOM: FundPayload = {
  omraade_id: null, titel: '', beskrivelse: null, kilde_aarsag: null, saerlige_grupper: null,
  alvor: null, sandsynlighed: null, alvor_efter: null, sandsynlighed_efter: null,
  nuvaerende_foranstaltninger: null, ansvarlig_id: null, status: 'ny', deadline: null, dokumenter: [],
}

export default function NytFund() {
  const navigate = useNavigate()
  const [omraader, setOmraader] = useState<Omraade[]>([])
  const [personer, setPersoner] = useState<PersonKort[]>([])
  const [busy, setBusy] = useState(false)
  const [fejl, setFejl] = useState('')

  useEffect(() => {
    Promise.all([hentOmraader(), hentPersoner()])
      .then(([o, p]) => { setOmraader(o); setPersoner(p) })
      .catch(e => setFejl(e.message ?? 'Kunne ikke hente opslag.'))
  }, [])

  async function submit(payload: FundPayload, begrundelse: string) {
    setBusy(true); setFejl('')
    try {
      await opretForslag({
        entitet: 'fund', operation: 'opret', maal_id: null,
        payload: fundPayloadTilJson(payload), begrundelse: begrundelse || null,
      })
      navigate('/mine-forslag')
    } catch (e) {
      setFejl((e as Error).message ?? 'Kunne ikke sende forslaget.')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <Link to="/fund" className="smu-btn-ghost inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Fund
      </Link>
      <div>
        <p className="smu-eyebrow">Forslag · nyt fund</p>
        <h1 className="smu-h1 mt-1">Foreslå nyt fund</h1>
        <p className="smu-meta text-[13px] mt-2">
          Dit forslag sendes til godkendelse. Fundet bliver først gældende, når en admin godkender det.
        </p>
      </div>
      {fejl && <p className="smu-error">{fejl}</p>}
      <FundForm initial={TOM} omraader={omraader} personer={personer}
        submitLabel="Send forslag" busy={busy}
        onSubmit={submit} onAnnuller={() => navigate('/fund')} />
    </div>
  )
}
