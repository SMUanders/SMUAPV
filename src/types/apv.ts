// =============================================================
// SMU APV — typer
// Fase 2 dækker den delte identitetsmodel + Fund-flowet (fund + forslag).
// Øvrige domænetyper (handling, kemikalie, …) tilføjes i deres egne faser
// jf. DOMAIN_MODEL.md.
// =============================================================

// ─── Delt bruger/profil-model (genbrugt fra SMU OS' profiler-tabel) ───
export type BrugerRolle =
  | 'admin'
  | 'daglig_leder'
  | 'tegnestue'
  | 'skærestue'
  | 'produktion'
  | 'montering'

export interface Profil {
  id: string
  fuldt_navn: string | null
  rolle: BrugerRolle
  aktiv: boolean
}

/** Admin er den eneste rolle med særrettigheder i SMU APV V1. */
export function erAdmin(profil: Profil | null): boolean {
  return profil?.rolle === 'admin' && profil?.aktiv === true
}

// ─── Områder (register/lookup) ───
export interface Omraade {
  id: string
  navn: string
  beskrivelse: string | null
  sort_order: number
  slettet: boolean
}

// ─── Fund ───
export type FundStatus = 'ny' | 'i_gang' | 'loest' | 'risiko_accepteret' | 'lukket'

export const FUND_STATUS_LABEL: Record<FundStatus, string> = {
  ny: 'Ny',
  i_gang: 'I gang',
  loest: 'Løst',
  risiko_accepteret: 'Risiko accepteret',
  lukket: 'Lukket',
}

export function fundStatusBadge(s: FundStatus): string {
  switch (s) {
    case 'ny':                return 'smu-badge smu-badge-blue'
    case 'i_gang':            return 'smu-badge smu-badge-orange'
    case 'loest':             return 'smu-badge smu-badge-green'
    case 'risiko_accepteret': return 'smu-badge smu-badge-violet'
    case 'lukket':            return 'smu-badge smu-badge-grey'
    default:                  return 'smu-badge smu-badge-grey'
  }
}

// Risikoniveau kommer ALTID fra databasen (apv_fund_beriget) — udledt af score.
// Her mapper vi kun værdien til label/badge; tærsklerne genimplementeres ikke.
export type Risikoniveau = 'lav' | 'middel' | 'hoej' | 'kritisk'

export const RISIKO_LABEL: Record<Risikoniveau, string> = {
  lav: 'Lav',
  middel: 'Middel',
  hoej: 'Høj',
  kritisk: 'Kritisk',
}

// Rød er reserveret til 'kritisk' (kræver reelt opmærksomhed). Høj = orange
// (advarsel), middel = neutral grå, lav = grøn. Følger SMU-semantikken.
export function risikoBadge(n: Risikoniveau | null): string {
  switch (n) {
    case 'kritisk': return 'smu-badge smu-badge-red'
    case 'hoej':    return 'smu-badge smu-badge-orange'
    case 'middel':  return 'smu-badge smu-badge-grey'
    case 'lav':     return 'smu-badge smu-badge-green'
    default:        return 'smu-badge smu-badge-grey'
  }
}

/**
 * Ét dokument = en reference. To former:
 *  - offentligt/eksternt link → `url` (åbnes direkte).
 *  - privat Storage-objekt → `bucket` + `path` (åbnes via signeret URL ved klik).
 */
export interface Dokument {
  navn: string
  url?: string
  bucket?: string
  path?: string
}

/** Fund som det kommer fra view'et apv_fund_beriget (score/risikoniveau udledt). */
export interface Fund {
  id: string
  omraade_id: string | null
  titel: string
  beskrivelse: string | null
  kilde_aarsag: string | null
  saerlige_grupper: string | null
  alvor: number | null
  sandsynlighed: number | null
  score: number | null
  alvor_efter: number | null
  sandsynlighed_efter: number | null
  score_efter: number | null
  nuvaerende_foranstaltninger: string | null
  ansvarlig_id: string | null
  status: FundStatus
  deadline: string | null
  dokumenter: Dokument[]
  slettet: boolean
  created_at: string
  created_by: string | null
  updated_at: string
  updated_by: string | null
  // Udledt i view'et:
  risikoniveau: Risikoniveau | null
  risikoniveau_efter: Risikoniveau | null
}

/** Redigerbare fund-felter (whitelist-kompatibel payload til apv_forslag). */
export interface FundPayload {
  omraade_id: string | null
  titel: string
  beskrivelse: string | null
  kilde_aarsag: string | null
  saerlige_grupper: string | null
  alvor: number | null
  sandsynlighed: number | null
  alvor_efter: number | null
  sandsynlighed_efter: number | null
  nuvaerende_foranstaltninger: string | null
  ansvarlig_id: string | null
  status: FundStatus
  deadline: string | null
  dokumenter: Dokument[]
}

/** Danske labels for fund-felter — brugt i detalje- og diff-visning. */
export const FUND_FELT_LABEL: Record<keyof FundPayload, string> = {
  omraade_id: 'Område',
  titel: 'Titel',
  beskrivelse: 'Beskrivelse',
  kilde_aarsag: 'Kilde / årsag',
  saerlige_grupper: 'Særlige grupper',
  alvor: 'Alvorlighed (1–5)',
  sandsynlighed: 'Sandsynlighed (1–5)',
  alvor_efter: 'Alvorlighed efter tiltag',
  sandsynlighed_efter: 'Sandsynlighed efter tiltag',
  nuvaerende_foranstaltninger: 'Nuværende foranstaltninger',
  ansvarlig_id: 'Ansvarlig',
  status: 'Status',
  deadline: 'Deadline',
  dokumenter: 'Dokumentreferencer',
}

// ─── Forslag ───
export type ForslagEntitet =
  | 'omraade' | 'fund' | 'handling' | 'kemikalie'
  | 'krv' | 'maskine' | 'eftersyn' | 'paabud'
export type ForslagOperation = 'opret' | 'ret' | 'slet'
export type ForslagStatus = 'afventer' | 'godkendt' | 'afvist'

export const FORSLAG_STATUS_LABEL: Record<ForslagStatus, string> = {
  afventer: 'Afventer',
  godkendt: 'Godkendt',
  afvist: 'Afvist',
}

export function forslagStatusBadge(s: ForslagStatus): string {
  switch (s) {
    case 'afventer': return 'smu-badge smu-badge-orange'
    case 'godkendt': return 'smu-badge smu-badge-green'
    case 'afvist':   return 'smu-badge smu-badge-red'
    default:         return 'smu-badge smu-badge-grey'
  }
}

export const FORSLAG_OPERATION_LABEL: Record<ForslagOperation, string> = {
  opret: 'Nyt',
  ret: 'Ændring',
  slet: 'Sletning',
}

export interface Forslag {
  id: string
  entitet: ForslagEntitet
  operation: ForslagOperation
  maal_id: string | null
  payload: Record<string, unknown>
  begrundelse: string | null
  status: ForslagStatus
  afvisning_note: string | null
  created_at: string
  created_by: string | null
  created_by_navn: string | null
  behandlet_at: string | null
  behandlet_by: string | null
}

// ─── Kemikalier (register — opslag) ───
export interface Kemikalie {
  id: string
  produktnavn: string
  leverandoer: string | null
  sds_dato: string | null
  h_saetninger: string[]
  piktogrammer: string[]
  anvendelse: string | null
  forbrug: string | null
  lagermaengde: string | null
  opbevaringssted: string | null
  substitution_mulig: boolean | null
  eksponeringsveje: string | null
  ventilation: string | null
  ppe: string | null
  affald: string | null
  dokumenter: Dokument[]
  arbejdsprocedure: string | null
  slettet: boolean
}

// ─── KRV (vurdering knyttet til et kemikalie) ───
export interface Krv {
  id: string
  kemikalie_id: string
  opgave_proces: string
  maengde: string | null
  varighed: string | null
  hyppighed: string | null
  arbejdsform: string | null
  ventilation: string | null
  eksponeret_antal: number | null
  graensevaerdi_relevant: boolean | null
  alvor_foer: number | null
  sandsynlighed_foer: number | null
  score_foer: number | null
  foranstaltninger: string | null
  instruktion_dato: string | null
  kontrol_tilsyn: string | null
  alvor_efter: number | null
  sandsynlighed_efter: number | null
  score_efter: number | null
  acceptabel: boolean | null
  dokumenter: Dokument[]
  slettet: boolean
}

// ─── Maskiner (register + beriget view med seneste/næste eftersyn) ───
export type MaskineStatus = 'ok' | 'anmaerkning' | 'ude_af_drift'

export const MASKINE_STATUS_LABEL: Record<MaskineStatus, string> = {
  ok: 'OK',
  anmaerkning: 'Anmærkning',
  ude_af_drift: 'Ude af drift',
}

export function maskineStatusBadge(s: MaskineStatus): string {
  switch (s) {
    case 'ok':           return 'smu-badge smu-badge-green'
    case 'anmaerkning':  return 'smu-badge smu-badge-orange'
    case 'ude_af_drift': return 'smu-badge smu-badge-red'
    default:             return 'smu-badge smu-badge-grey'
  }
}

export interface Maskine {
  id: string
  type: string | null
  navn: string
  serienr: string | null
  fabrikat_model: string | null
  aargang: number | null
  omraade_id: string | null
  ansvarlig_id: string | null
  eftersyn_interval_mdr: number | null
  daglig_tjek: boolean
  status: MaskineStatus
  dokumenter: Dokument[]
  note: string | null
  slettet: boolean
  // fra apv_maskiner_beriget:
  seneste_eftersyn: string | null
  naeste_eftersyn: string | null
}

// ─── Påbud (myndighedssag — opslag) ───
export type PaabudType = 'strakspaabud' | 'paabud' | 'vejledning'
export type PaabudStatus = 'modtaget' | 'i_gang' | 'afventer_at' | 'afsluttet'

export const PAABUD_TYPE_LABEL: Record<PaabudType, string> = {
  strakspaabud: 'Strakspåbud',
  paabud: 'Påbud',
  vejledning: 'Vejledning',
}

export const PAABUD_STATUS_LABEL: Record<PaabudStatus, string> = {
  modtaget: 'Modtaget',
  i_gang: 'I gang',
  afventer_at: 'Afventer AT',
  afsluttet: 'Afsluttet',
}

export function paabudStatusBadge(s: PaabudStatus): string {
  switch (s) {
    case 'modtaget':    return 'smu-badge smu-badge-blue'
    case 'i_gang':      return 'smu-badge smu-badge-orange'
    case 'afventer_at': return 'smu-badge smu-badge-violet'
    case 'afsluttet':   return 'smu-badge smu-badge-green'
    default:            return 'smu-badge smu-badge-grey'
  }
}

export interface Paabud {
  id: string
  type: PaabudType
  myndighed: string
  titel: string
  krav: string | null
  dato_modtaget: string | null
  ansvarlig_id: string | null
  frist: string | null
  status: PaabudStatus
  dato_tilbagemelding: string | null
  dokumenter: Dokument[]
  slettet: boolean
}
