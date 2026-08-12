// Delte formateringsfunktioner (da-DK) — genbrugt fra SMU OS/Wiki-mønsteret.

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
