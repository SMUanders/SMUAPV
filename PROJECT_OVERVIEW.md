# PROJECT_OVERVIEW.md — SMU APV

Arkitektur- og produktoverblik for **SMU APV**. Dette dokument beskriver *hvad*
appen er og *hvorfor*. Den præcise datamodel lever i [`DOMAIN_MODEL.md`](DOMAIN_MODEL.md).

> Status: **arkitekturudkast, godkendt.** Ingen appkode, scaffold eller database
> er bygget endnu. Næste skridt (Fase 0) afventer selvstændig godkendelse.

---

## 1. Hvad SMU APV er

SMU APV er et **arbejdsmiljøsystem** for Signmeup — en lille, fokuseret webapp i
SMU-familien, der digitaliserer virksomhedens **arbejdspladsvurdering (APV)** og
det løbende arbejdsmiljøarbejde.

Den erstatter det nuværende regneark (`APV Signmeup.xlsx`) med et rigtigt system,
hvor fund, handlinger, kemikalier, maskiner, eftersyn og myndighedspåbud kan
følges som **levende arbejdsflow** — ikke som statiske ark.

Appen er **arbejdsorienteret, ikke regneark-orienteret**: forsiden svarer på
"hvad kræver handling nu", ikke "her er alle rækker i en tabel".

---

## 2. Hvem bruger det

- **Alle medarbejdere** (`fornavn@signmeup.dk`): kan læse alt og **foreslå**
  oprettelser, ændringer og sletninger. De ser deres egne forslag.
- **Admin** (arbejdsmiljøansvarlig, fx AP): kan **gøre ændringer gældende** —
  godkende/afvise forslag, og redigere de autoritative domænedata direkte.

Der er ingen offentlig adgang og ingen selvbetjent oprettelse af brugere.
Brugere er de eksisterende SMU-brugere.

---

## 3. Hvorfor det eksisterer

- **Lovpligtigt:** enhver arbejdsplads skal have en ajourført APV. Regnearket er
  skrøbeligt, uden historik, uden ansvarsstyring og uden påmindelser.
- **Sporbarhed:** fund, tiltag, eftersyn og påbud skal kunne følges over tid med
  ansvarlig, status og deadline — ikke overskrives i en celle.
- **Myndighedsberedskab:** ved tilsyn/påbud fra Arbejdstilsynet skal dokumentation
  og tilbagemeldinger kunne fremvises samlet og hurtigt.
- **Fælles kilde til sandhed:** ét sted for kemikalier (SDS/CLP), maskin-eftersyn
  og kemisk risikovurdering i stedet for spredte ark og mapper.

---

## 4. Forholdet til SMU OS og SMU Wiki

SMU APV er en **selvstændig app** i SMU-porteføljen. Den fungerer alene, men er
bygget til at kunne løftes ind i **SMU OS** senere uden omskrivning.

| Deles på tværs | Er app-specifikt |
|---|---|
| Supabase-projekt (samme database + auth) | Alle `apv_`-tabeller |
| Login / brugere (`auth.users`) | App-ruter, UI, forretningslogik |
| Delt identitet (`profiler`) | Netlify-site + repo |
| Visuelt designunivers (SMU Design System) | — |

- **SMU OS** (`smu-os-v2`) er navet og den kanoniske kilde til standard + design.
- **SMU Wiki** er den nærmeste tekniske skabelon: samme stack (React 19, Vite,
  Tailwind 4, react-router), samme delte `profiler`-tabel, samme
  `xxx_er_admin()`-mønster, og samme **forslag → admin-godkendelse**-filosofi.
- **Tabel-prefix:** SMU APV bruger `apv_`. `profiler` + `auth.users` deles —
  de læses, oprettes ikke igen.

Afvigelse fra standardens udgangspunkt "ingen roller": APV har et **bevist behov**
for en medarbejder/admin-adskillelse (godkendelsesflow). Dette dokumenteres her og
i appens kommende `CLAUDE.md`, jf. `SMU_APP_STANDARD.md` §5.

---

## 5. Hovedarbejdsflow

APV'ens kerne er en løkke: **observér → vurdér → handl → verificér.**

1. **Fund oprettes** — en medarbejder foreslår et fund (observation/risiko) med
   område, beskrivelse og en risikovurdering (alvor × sandsynlighed).
2. **Admin godkender** — fundet bliver autoritativt, får ansvarlig, status og
   evt. deadline.
3. **Handlinger** knyttes til fundet (eller til et påbud, eller står frit) med
   prioritet, ansvarlig og deadline.
4. **Restrisiko** vurderes, når handlinger er gennemført — fundet lukkes eller
   sættes til `risiko_accepteret`.
5. **Løbende drift** ved siden af APV-løkken:
   - **Kemikalier** vedligeholdes som register; hvert kemikalie kan have en eller
     flere **kemiske risikovurderinger (KRV)**.
   - **Maskiner** har **eftersyn** logget over tid; systemet beregner næste
     eftersyn og varsler forfaldne.
   - **Påbud** fra myndighed følges som selvstændige sager med krav, ansvarlig,
     frist og dokumentation.

Alt, en ikke-admin gør, går gennem **forslag**; admin gør det gældende.

---

## 6. V1-scope

V1 dækker hele APV-domænet, men med bevidst afgrænset dybde:

**Domæneentiteter (autoritative, typed):**
- Fund (med indlejret risikovurdering + beregnet score/niveau)
- Handling (koblet til fund/påbud eller selvstændig)
- Område (lookup)
- Kemikalie (register)
- KRV (vurdering, altid koblet til et kemikalie)
- Maskine (register)
- Eftersyn (log pr. maskine — kilde til seneste/næste eftersyn)
- Påbud (myndighedssag)

**System:**
- Forslag → admin-godkendelse (`apv_forslag` + `apv_godkend_forslag()` med
  eksplicit whitelist)
- Delt login/auth via Supabase; login-gate; SMU-designunivers
- Forside/dashboard som handlingsliste
- Dokumentreferencer som link/tekst (`dokumenter`)

**Konventioner (fra SMU-standard):**
- Soft-delete overalt (`slettet`), audit (`created_by`/`updated_by` = `auth.uid()`)
- RLS `to authenticated`, strammet med rolle hvor relevant
- Alt på dansk (kode, felter, UI)

---

## 7. Hvad der bevidst IKKE er V1

- **Fil-upload** via Supabase Storage — V1 bruger link/reference-tekst i
  `dokumenter`.
- **PDF-eksport** af APV / KRV-arbejdsinstruks (jsPDF).
- **Påmindelser/notifikationer** (email/OS) når eftersyn eller deadline forfalder.
- **Fuld versions-/audit-historik** på fund (som Wiki's ændringshistorik).
- **Rapport/statistik/BI** — forsiden er en handlingsliste, ikke et analysemodul.
- **Særlige grupper** (gravide/unge) som selvstændigt workflow — V1 har det som
  felt på fund.
- **Caching af beregnede eftersyns-datoer** — kun hvis en teknisk grund opstår;
  domænemæssigt er eftersynsloggen kilden til sandhed.
- **Indløftning i SMU OS** — muliggjort af arkitekturen, men ikke en V1-opgave.

---

## 8. Princip: forslag → admin-godkendelse

Kernebeslutning for hele appen:

- **Alle** indloggede kan læse og **oprette forslag** (opret/ret/slet) mod enhver
  domæneentitet.
- **Kun admin** kan gøre et forslag gældende. Ved godkendelse skrives forslagets
  indhold ind i den **typed, autoritative** domænetabel.
- Det generiske `apv_forslag` (med `payload jsonb`) er **kun en indbakke**.
  Godkendelsesfunktionen `apv_godkend_forslag()` arbejder med en **eksplicit
  whitelist** over tilladte entiteter, operationer og felter — ingen generisk
  dynamic-SQL-motor der skriver vilkårligt ud fra tabelnavn + JSON.
- Fritekst-payload er aldrig sandheden. De typed domænetabeller er den eneste
  autoritative kilde.

Detaljer i [`DOMAIN_MODEL.md`](DOMAIN_MODEL.md).
