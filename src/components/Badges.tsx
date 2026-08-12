import {
  RISIKO_LABEL, FUND_STATUS_LABEL, risikoBadge, fundStatusBadge,
  type Risikoniveau, type FundStatus,
} from '../types/apv'

export function RisikoBadge({ niveau }: { niveau: Risikoniveau | null }) {
  return (
    <span className={risikoBadge(niveau)}>
      {niveau ? RISIKO_LABEL[niveau] : 'Ikke vurderet'}
    </span>
  )
}

export function FundStatusBadge({ status }: { status: FundStatus }) {
  return <span className={fundStatusBadge(status)}>{FUND_STATUS_LABEL[status]}</span>
}
