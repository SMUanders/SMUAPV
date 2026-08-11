// =============================================================
// SMU APV — typer
// I scaffold-fasen dækker denne fil KUN den delte identitetsmodel.
// APV-domænetyper (Fund, Handling, Kemikalie, …) tilføjes i deres egne faser
// jf. DOMAIN_MODEL.md — ingen APV-features i denne fase.
// =============================================================

// ─── Delt bruger/profil-model (genbrugt fra SMU OS' profiler-tabel) ───
// Samme rolle-union som de øvrige SMU-apps; APV skelner i praksis kun mellem
// admin og "almindelig medarbejder" (jf. forslag → admin-godkendelse).
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
