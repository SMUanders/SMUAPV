// Delte formateringsfunktioner (da-DK) — genbrugt fra SMU OS/Wiki-mønsteret.
import type { TjekStatus } from '../types/apv'

/** Lokal dags-dato som YYYY-MM-DD. */
function iDagISO(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

/** Er tidsstemplet (created_at o.l.) fra i dag (lokal tid)? */
export function erIDag(iso: string | null | undefined): boolean {
  if (!iso) return false
  const d = new Date(iso), n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

/** Er datoen (YYYY-MM-DD) FØR i dag? Bruges til forfaldne frister/eftersyn. */
export function erFortid(iso: string | null | undefined): boolean {
  if (!iso) return false
  return iso.slice(0, 10) < iDagISO()
}

/** Klokkeslæt (da-DK), fx "07:14". */
export function dkTid(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

// Kontrol før brug er en KONTROL FØR BRUG: den gælder for I DAG. Findes der
// ingen kontrol i dag, er det en NEUTRAL tilstand (ikke en fejl/manglende
// efterlevelse). En kontrol fra i går gør ikke liften godkendt i dag.
export type KontrolStatus = 'ikke_i_dag' | 'godkendt' | 'fejl'

export function kontrolStatus(seneste: { created_at: string; status: TjekStatus } | null): KontrolStatus {
  if (seneste && erIDag(seneste.created_at)) return seneste.status === 'fejl' ? 'fejl' : 'godkendt'
  return 'ikke_i_dag'
}


/** ISO-dato → dansk format (dd.mm.yyyy) */
export function dkDato(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** ISO-dato → kort dansk format (1. maj 2026) */
export function dkDatoKort(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** ISO-dato+tid → dansk format (1. maj 14:32) */
export function dkDatoTid(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Relativ tid på dansk: "lige nu", "5 minutter siden", "i går" osv. */
export function relativTid(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const sek = Math.floor(ms / 1000)
  const min = Math.floor(sek / 60)
  const tim = Math.floor(min / 60)
  const dag = Math.floor(tim / 24)
  if (sek < 60) return 'lige nu'
  if (min < 60) return `${min} minut${min === 1 ? '' : 'ter'} siden`
  if (tim < 24) return `${tim} time${tim === 1 ? '' : 'r'} siden`
  if (dag === 1) return 'i går'
  if (dag < 30) return `${dag} dage siden`
  const mdr = Math.floor(dag / 30)
  if (mdr < 12) return `${mdr} måned${mdr === 1 ? '' : 'er'} siden`
  return `${Math.floor(mdr / 12)} år siden`
}
