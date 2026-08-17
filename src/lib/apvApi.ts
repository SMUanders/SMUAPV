import { supabase } from './supabase'
import type {
  Fund, FundPayload, Omraade, Forslag, ForslagEntitet, ForslagOperation,
  Kemikalie, Krv, Maskine, Paabud, DagligtTjek, DagligtTjekPunkt, TjekResultat,
} from '../types/apv'

// =============================================================
// SMU APV — datalag (Fase 2: Fund + forslag)
// Læsning sker mod view'et apv_fund_beriget (score/risikoniveau fra DB).
// Medarbejdere skriver ALDRIG direkte til apv_fund — kun via apv_forslag.
// Godkendelse/afvisning sker via RPC (apv_godkend_forslag/apv_afvis_forslag).
// =============================================================

// ─── Opslag: områder + profiler (til navne og dropdowns) ───

export async function hentOmraader(): Promise<Omraade[]> {
  const { data, error } = await supabase
    .from('apv_omraader')
    .select('id, navn, beskrivelse, sort_order, slettet')
    .eq('slettet', false)
    .order('sort_order', { ascending: true })
    .order('navn', { ascending: true })
  if (error) throw error
  return (data as Omraade[]) ?? []
}

export interface PersonKort { id: string; fuldt_navn: string | null }

/**
 * Aktive profiler til ansvarlig-valg og navne-opslag (delt profiler-tabel).
 * profiler ejes af SMU OS; hvis dens RLS ikke tillader bred læsning, degraderer
 * vi pænt (tom liste → navne vises som "—") frem for at vælte siden.
 */
export async function hentPersoner(): Promise<PersonKort[]> {
  const { data, error } = await supabase
    .from('profiler')
    .select('id, fuldt_navn, aktiv')
    .eq('aktiv', true)
    .order('fuldt_navn', { ascending: true })
  if (error) return []
  return ((data as PersonKort[]) ?? [])
}

// ─── Fund (læsning via view) ───

export async function hentFund(): Promise<Fund[]> {
  const { data, error } = await supabase
    .from('apv_fund_beriget')
    .select('*')
    .eq('slettet', false)
    .order('score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Fund[]) ?? []
}

export async function hentFundEnkelt(id: string): Promise<Fund | null> {
  const { data, error } = await supabase
    .from('apv_fund_beriget')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as Fund) ?? null
}

// ─── Forslag ───

/**
 * Opret et forslag. Skriver KUN til apv_forslag — aldrig til domænetabellen.
 * created_by/status sættes af DB (auth.uid() / 'afventer').
 */
export async function opretForslag(input: {
  entitet: ForslagEntitet
  operation: ForslagOperation
  maal_id: string | null
  payload: Record<string, unknown>
  begrundelse: string | null
}): Promise<void> {
  const { error } = await supabase.from('apv_forslag').insert({
    entitet: input.entitet,
    operation: input.operation,
    maal_id: input.maal_id,
    payload: input.payload,
    begrundelse: input.begrundelse,
  })
  if (error) throw error
}

/** Hjælper: byg fund-forslag-payload (tomme strenge → null). */
export function fundPayloadTilJson(p: FundPayload): Record<string, unknown> {
  return {
    omraade_id: p.omraade_id || null,
    titel: p.titel.trim(),
    beskrivelse: tomTilNull(p.beskrivelse),
    kilde_aarsag: tomTilNull(p.kilde_aarsag),
    saerlige_grupper: tomTilNull(p.saerlige_grupper),
    alvor: p.alvor,
    sandsynlighed: p.sandsynlighed,
    alvor_efter: p.alvor_efter,
    sandsynlighed_efter: p.sandsynlighed_efter,
    nuvaerende_foranstaltninger: tomTilNull(p.nuvaerende_foranstaltninger),
    ansvarlig_id: p.ansvarlig_id || null,
    status: p.status,
    deadline: p.deadline || null,
    dokumenter: p.dokumenter.filter(d => d.navn.trim() || (d.url ?? '').trim()),
  }
}

function tomTilNull(v: string | null): string | null {
  if (v == null) return null
  const t = v.trim()
  return t === '' ? null : t
}

/** Mine egne forslag (RLS scoper til egne). */
export async function hentMineForslag(): Promise<Forslag[]> {
  const { data, error } = await supabase
    .from('apv_forslag')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Forslag[]) ?? []
}

/** Afventende forslag (admin ser alle via RLS). */
export async function hentAfventendeForslag(): Promise<Forslag[]> {
  const { data, error } = await supabase
    .from('apv_forslag')
    .select('*')
    .eq('status', 'afventer')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as Forslag[]) ?? []
}

/**
 * Diskret "afventer"-tjek for et fund. Kalder SECURITY DEFINER-funktionen, så
 * ALLE authenticated får kun en boolean — ingen payload/forfatter/detaljer.
 * Degraderer pænt (false) ved fejl, så banneret blot skjules.
 */
export async function fundHarAfventendeForslag(fundId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('apv_fund_har_afventende_forslag', { p_fund_id: fundId })
  if (error) return false
  return data === true
}

/** Godkend via RPC — frontend simulerer ALDRIG selv anvendelsen. */
export async function godkendForslag(id: string): Promise<void> {
  const { error } = await supabase.rpc('apv_godkend_forslag', { p_forslag_id: id })
  if (error) throw error
}

/** Afvis via RPC (med valgfri begrundelse). */
export async function afvisForslag(id: string, note: string | null): Promise<void> {
  const { error } = await supabase.rpc('apv_afvis_forslag', { p_forslag_id: id, p_note: note })
  if (error) throw error
}

// ─── Opslag: kemikalier + KRV ───

export async function hentKemikalier(): Promise<Kemikalie[]> {
  const { data, error } = await supabase
    .from('apv_kemikalier').select('*').eq('slettet', false)
    .order('produktnavn', { ascending: true })
  if (error) throw error
  return (data as Kemikalie[]) ?? []
}

export async function hentKemikalieEnkelt(id: string): Promise<Kemikalie | null> {
  const { data, error } = await supabase
    .from('apv_kemikalier').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Kemikalie) ?? null
}

export async function hentKrvForKemikalie(kemikalieId: string): Promise<Krv[]> {
  const { data, error } = await supabase
    .from('apv_krv').select('*').eq('kemikalie_id', kemikalieId).eq('slettet', false)
    .order('opgave_proces', { ascending: true })
  if (error) throw error
  return (data as Krv[]) ?? []
}

// ─── Opslag: maskiner (via beriget view for seneste/næste eftersyn) ───

export async function hentMaskiner(): Promise<Maskine[]> {
  const { data, error } = await supabase
    .from('apv_maskiner_beriget').select('*').eq('slettet', false)
    .order('navn', { ascending: true })
  if (error) throw error
  return (data as Maskine[]) ?? []
}

export async function hentMaskineEnkelt(id: string): Promise<Maskine | null> {
  const { data, error } = await supabase
    .from('apv_maskiner_beriget').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Maskine) ?? null
}

// ─── Opslag: påbud ───

export async function hentPaabud(): Promise<Paabud[]> {
  const { data, error } = await supabase
    .from('apv_paabud').select('*').eq('slettet', false)
    .order('dato_modtaget', { ascending: false, nullsFirst: false })
  if (error) throw error
  return (data as Paabud[]) ?? []
}

export async function hentPaabudEnkelt(id: string): Promise<Paabud | null> {
  const { data, error } = await supabase
    .from('apv_paabud').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Paabud) ?? null
}

// ─── Daglig tjekliste ───

export interface TjekPunktInput {
  punkt_nr: number
  punkt_tekst: string
  resultat: TjekResultat
  note: string | null
}

/**
 * Opret et dagligt tjek via RPC (eneste write-vej). Bruger, tidspunkt og samlet
 * status fastsættes server-side; header + punkter oprettes atomisk.
 * Returnerer id på det oprettede tjek.
 */
export async function opretDagligtTjek(
  maskineId: string, punkter: TjekPunktInput[], note: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc('apv_opret_dagligt_tjek', {
    p_maskine_id: maskineId, p_punkter: punkter, p_note: note,
  })
  if (error) throw error
  return data as string
}

/** Let visning af seneste tjek (til lift-kort). */
export type SenesteTjek = Pick<DagligtTjek, 'id' | 'maskine_id' | 'created_at' | 'status' | 'udfoert_af_navn'>

/**
 * Seneste daglige tjek pr. maskine — ÉN query (ingen N+1). Henter alle tjek
 * sorteret nyeste-først og beholder det første pr. maskine.
 * (Vokser loggen sig stor, er den mindste optimering et `distinct on`-view;
 * unødvendigt ved nuværende datamængde.)
 */
export async function hentSenesteTjekPrMaskine(): Promise<Record<string, SenesteTjek>> {
  const { data, error } = await supabase
    .from('apv_daglige_tjek')
    .select('id, maskine_id, created_at, status, udfoert_af_navn')
    .order('created_at', { ascending: false })
  if (error) throw error
  const seneste: Record<string, SenesteTjek> = {}
  for (const row of (data as SenesteTjek[]) ?? []) {
    if (!seneste[row.maskine_id]) seneste[row.maskine_id] = row
  }
  return seneste
}

/** Historik af daglige tjek for en maskine (nyeste først). */
export async function hentDagligeTjek(maskineId: string): Promise<DagligtTjek[]> {
  const { data, error } = await supabase
    .from('apv_daglige_tjek').select('*')
    .eq('maskine_id', maskineId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as DagligtTjek[]) ?? []
}

/** Ét tjek med alle punkter (read-only visning). */
export async function hentDagligtTjek(
  tjekId: string,
): Promise<{ tjek: DagligtTjek | null; punkter: DagligtTjekPunkt[] }> {
  const [h, p] = await Promise.all([
    supabase.from('apv_daglige_tjek').select('*').eq('id', tjekId).maybeSingle(),
    supabase.from('apv_daglige_tjek_punkter').select('*').eq('tjek_id', tjekId)
      .order('punkt_nr', { ascending: true }),
  ])
  if (h.error) throw h.error
  if (p.error) throw p.error
  return { tjek: (h.data as DagligtTjek) ?? null, punkter: (p.data as DagligtTjekPunkt[]) ?? [] }
}

// ─── Storage: signeret URL til private dokumenter ───
// Bruges KUN til private buckets (fx apv-internt). RLS-select-policyen for
// authenticated gater adgangen; ingen service-role i frontend.
export async function signeretUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60)
  if (error) throw error
  return data.signedUrl
}
