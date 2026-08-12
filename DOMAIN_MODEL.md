# DOMAIN_MODEL.md — SMU APV

Præcis domænemodel for SMU APV: entiteter, relationer, beregnede værdier,
statusflows og hvad der er levende data vs. snapshot. Produkt-/scopeoverblik i
[`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md).

> Excel-APV'en (`APV Signmeup.xlsx`) er brugt som kilde til *eksisterende indhold,
> felter og arbejdsgange* — **ikke** som arkitekturfacit. Modellen er designet fra
> domænet.

> Alle tabelnavne, felter og statusværdier er **på dansk**. Konkrete SQL-typer og
> migrationer fastlægges i implementeringsfasen — dette dokument er den
> autoritative beskrivelse af *hvad* der modelleres.

---

## 1. Tre slags data: register vs. arbejdsflow vs. vurdering

Den bærende opdeling i systemet:

| Kategori | Karakter | Entiteter |
|---|---|---|
| **Arbejdsflow** | Livscyklus med status, ansvarlig, deadline; "kræver handling" | Fund, Handling, Påbud, Eftersyn |
| **Register** | Stamdata, admin-kurateret, skifter langsomt | Kemikalie, Maskine, Område |
| **Vurdering** | Bedømmelses-dokument knyttet til noget andet | KRV (→ kemikalie), risikovurdering (indlejret i fund) |

**Profil/bruger** er en delt SMU-identitet på tværs af kategorierne (ansvarlig,
audit). **Forslag** er et system-lag oven på det hele.

---

## 2. Fælles konventioner

Gælder alle `apv_`-domænetabeller (fra `SMU_APP_STANDARD.md`):

- **Primærnøgle:** `id uuid` (gen_random_uuid).
- **Soft-delete:** `slettet boolean` — aldrig hard delete. Registre kan i stedet
  bruge `aktiv boolean` for stamdata.
- **Audit:** `created_at`, `created_by`, `updated_at`, `updated_by`. `*_by` =
  `auth.uid()`, sendt eksplicit fra klienten.
- **RLS:** `to authenticated`. Læsning: alle indloggede. Direkte skrivning i
  domænetabeller: **kun admin** (`apv_er_admin()`). Ikke-admins skriver via
  `apv_forslag`.
- **Ansvarlig og "udført af" er FK til `profiler`** — aldrig fritekst-navne.

---

## 3. Delt identitet: Profil / bruger

**`profiler`** (delt, ejes ikke af APV — læses, oprettes ikke igen)

| Felt | Beskrivelse |
|---|---|
| `id uuid` | = `auth.users.id` |
| `fuldt_navn text` | Visningsnavn |
| `rolle text` | Bl.a. `admin` — styrer godkendelsesret i APV |
| `aktiv boolean` | Deaktiveret bruger har ingen adgang |

- APV læser `profiler` via en delt hjælper (svarende til Wiki/Tid).
- `apv_er_admin()` (SECURITY DEFINER, fast search_path) = `rolle='admin' AND
  aktiv=true`. Bruges i RLS og i godkendelsesfunktionen.
- Alle `ansvarlig_id` / `udfoert_af_id` i APV er FK → `profiler(id)`.

---

## 4. Entiteter

### 4.1 Fund — `apv_fund` *(arbejdsflow)*

Et fund/en observation. APV'ens hjerte. Bærer sin egen **risikovurdering** som
indlejrede felter (1:1 med fundet).

| Felt | Type/domæne | Note |
|---|---|---|
| `id` | uuid | |
| `omraade_id` | FK → `apv_omraader` | Hvor findet hører til |
| `titel` | text | Kort overskrift |
| `beskrivelse` | text | Problem/risiko |
| `kilde_aarsag` | text | Kilde/årsag |
| `saerlige_grupper` | text | Gravide/unge under 18 (V1: felt, ikke workflow) |
| `alvor` | int 1–5 | **Indtastes** |
| `sandsynlighed` | int 1–5 | **Indtastes** |
| `score` | int | **Beregnet** = `alvor × sandsynlighed` — ikke redigerbar |
| `risikoniveau` | udledt | **Beregnet** af `score` (se §5) — ikke redigerbar |
| `alvor_efter` | int 1–5, nullable | Restrisiko efter tiltag, **indtastes** |
| `sandsynlighed_efter` | int 1–5, nullable | **Indtastes** |
| `score_efter` | int, nullable | **Beregnet** = `alvor_efter × sandsynlighed_efter` |
| `risikoniveau_efter` | udledt, nullable | **Beregnet** |
| `nuvaerende_foranstaltninger` | text | Hvad der allerede gøres |
| `ansvarlig_id` | FK → `profiler`, nullable | |
| `status` | enum (se §6) | `ny` / `i_gang` / `loest` / `risiko_accepteret` / `lukket` |
| `deadline` | date, nullable | |
| `dokumenter` | jsonb | Liste af `{navn, url}` (link/tekst i V1) |
| audit + `slettet` | | |

**Relationer:** 1 fund → mange **handlinger**. Fund hører til ét **område**.

### 4.2 Handling — `apv_handlinger` *(arbejdsflow)*

Et tiltag. Kan hænge på et fund, på et påbud, eller stå helt frit.

| Felt | Type/domæne | Note |
|---|---|---|
| `id` | uuid | |
| `fund_id` | FK → `apv_fund`, **nullable** | |
| `paabud_id` | FK → `apv_paabud`, **nullable** | |
| `titel` | text | |
| `beskrivelse` | text | Baggrund/tiltag |
| `prioritet` | enum | `hoej` / `middel` / `lav` |
| `ansvarlig_id` | FK → `profiler`, nullable | |
| `startdato` | date, nullable | |
| `deadline` | date, nullable | |
| `opfoelgning_dato` | date, nullable | |
| `ressourcer_udgift` | text, nullable | Fri beskrivelse/estimat |
| `status` | enum | `planlagt` / `i_gang` / `faerdig` / `annulleret` |
| `dokumenter` | jsonb | |
| audit + `slettet` | | |

**Typed frem for polymorf:** to eksplicitte, nullable FK'er (`fund_id`,
`paabud_id`) i stedet for en generisk "kilde_type + kilde_id". En handling kan
have ingen, den ene eller den anden — men bør ikke pege på både fund og påbud
samtidig (håndhæves i app/CHECK).

### 4.3 Område — `apv_omraader` *(register / lookup)*

Fysiske/organisatoriske områder (Værksted, Lager, Kontor …). Driver filtrering og
dashboard-per-område.

| Felt | Note |
|---|---|
| `id uuid` | |
| `navn text` | Unik |
| `beskrivelse text` | Valgfri |
| `sort_order int` | Rækkefølge i UI |
| `aktiv boolean` | Stamdata: aktiv/inaktiv frem for slettet |
| audit | |

### 4.4 Kemikalie — `apv_kemikalier` *(register)*

Kemisk produkt med SDS/CLP-oplysninger.

| Felt | Note |
|---|---|
| `id uuid` | |
| `produktnavn text` | |
| `leverandoer text` | |
| `sds_dato date` | Dato på sikkerhedsdatablad |
| `h_saetninger jsonb` | CLP H-sætninger (liste; jsonb for ensartet forslags-pipeline) |
| `piktogrammer jsonb` | Farepiktogrammer (Excel `#VALUE!` importeres ikke → tom liste) |
| `anvendelse text` | Proces/anvendelse |
| `forbrug text` | Forbrug pr. uge (additivt felt fra Excel) |
| `lagermaengde text` | Lagermængde (additivt felt fra Excel) |
| `opbevaringssted text` | |
| `ppe text` | Værnemidler |
| `eksponeringsveje text` | Hud/ånding/øjne |
| `ventilation text` | Lokal/rum/ingen |
| `substitution_mulig boolean` | |
| `affald text` | Bortskaffelse |
| `arbejdsprocedure text` | Arbejdsprocedure/instruks (additivt felt fra Excel) |
| `dokumenter jsonb` | SDS + arbejdsprocedure (link/reference) |
| `slettet boolean` + audit | |

**Relation:** 1 kemikalie → mange **KRV**.

### 4.5 KRV — `apv_krv` *(vurdering, koblet til kemikalie)*

Kemisk risikovurdering pr. opgave/proces. **Altid** knyttet til ét konkret
kemikalie.

| Felt | Note |
|---|---|
| `id uuid` | |
| `kemikalie_id` | FK → `apv_kemikalier` **NOT NULL** |
| `opgave_proces text` | |
| `maengde text` | fx ml/uge |
| `varighed text` | min/opgave |
| `hyppighed text` | gange/uge |
| `arbejdsform text` | åben/lukket |
| `ventilation text` | lokal/rum/ingen |
| `eksponeret_antal int` | |
| `graensevaerdi_relevant boolean` | |
| `alvor_foer` / `sandsynlighed_foer` int 1–5 | **Indtastes** |
| `score_foer int` | **Beregnet** |
| `foranstaltninger text` | TEK/SUB/ORG/PPE |
| `instruktion_dato date` | |
| `kontrol_tilsyn text` | Hvordan/hvor ofte |
| `alvor_efter` / `sandsynlighed_efter` int 1–5, nullable | **Indtastes** |
| `score_efter int, nullable` | **Beregnet** |
| `acceptabel boolean` | Er restrisikoen acceptabel |
| `dokumenter jsonb` | Bilag/arbejdsinstruks |
| audit + `slettet` | |

### 4.6 Maskine — `apv_maskiner` *(register)*

Maskine/udstyr. Bemærk: **`seneste_eftersyn` er IKKE et manuelt felt her** — det
udledes af eftersynsloggen (§5).

| Felt | Note |
|---|---|
| `id uuid` | |
| `type text` | fx Sakselift |
| `navn text` | Kaldenavn |
| `serienr text` | ID/serienummer |
| `fabrikat_model text` | |
| `aargang int` | |
| `omraade_id` | FK → `apv_omraader`, nullable |
| `ansvarlig_id` | FK → `profiler`, nullable |
| `eftersyn_interval_mdr int` | Interval mellem eftersyn |
| `daglig_tjek boolean` | Kræver dagligt tjek |
| `status text` | fx `ok` / `anmaerkning` / `ude_af_drift` |
| `note text` | Fri note (fx instruksskilt) — additivt felt fra Excel |
| `dokumenter jsonb` | Brugsanvisning/tjekliste/foto (link/reference) |
| `slettet boolean` + audit | |

**Afledte, ikke-lagrede felter** (beregnes ved læsning, §5):
- `seneste_eftersyn` = dato på nyeste relevante eftersynspost.
- `naeste_eftersyn` = `seneste_eftersyn + eftersyn_interval_mdr`.

**Relation:** 1 maskine → mange **eftersyn**.

### 4.7 Eftersyn — `apv_eftersyn` *(arbejdsflow / logpost)*

En logget eftersynshændelse på en maskine. **Kilden til sandhed** for seneste/næste
eftersyn. Hver post er en historisk kendsgerning (snapshot, §7).

| Felt | Type/domæne | Note |
|---|---|---|
| `id` | uuid | |
| `maskine_id` | FK → `apv_maskiner` **NOT NULL** | |
| `dato` | date | Hvornår eftersynet blev udført |
| `udfoert_af_id` | FK → `profiler`, nullable | Hvem der udførte det |
| `resultat` | enum | `ok` / `anmaerkning` / `kasseret` |
| `note` | text | Bemærkninger/fund ved eftersynet |
| `dokumenter` | jsonb | Rapport/foto-reference |
| audit + `slettet` | | |

"Nyeste relevante eftersynspost" = højeste `dato` blandt ikke-slettede poster for
maskinen. `seneste_eftersyn` og `naeste_eftersyn` på maskinen må **ikke** kunne
redigeres direkte — de følger loggen. (Evt. caching er en ren teknisk optimering
senere; loggen forbliver domænekilden.)

### 4.8 Påbud — `apv_paabud` *(arbejdsflow, myndighedssag)*

Krav/afgørelse fra myndighed, følges som selvstændig sag.

| Felt | Type/domæne | Note |
|---|---|---|
| `id` | uuid | |
| `type` | enum | `strakspaabud` / `paabud` / `vejledning` |
| `myndighed` | text | Default "Arbejdstilsynet" |
| `titel` | text | |
| `krav` | text | Hvad myndigheden kræver |
| `dato_modtaget` | date | |
| `ansvarlig_id` | FK → `profiler`, nullable | |
| `frist` | date, nullable | Frist for efterlevelse/tilbagemelding |
| `status` | enum | `modtaget` / `i_gang` / `afventer_at` / `afsluttet` |
| `dato_tilbagemelding` | date, nullable | Sendt til myndighed |
| `dokumenter` | jsonb | Instrukser, fotos, service |
| audit + `slettet` | | |

**Relation:** 1 påbud → mange **handlinger** (via `apv_handlinger.paabud_id`).

### 4.9 Forslag — `apv_forslag` *(system)*

Generisk indbakke for medarbejder-forslag. **Ikke** en autoritativ datakilde.

| Felt | Type/domæne | Note |
|---|---|---|
| `id` | uuid | |
| `entitet` | enum | Whitelistet: `fund` / `handling` / `omraade` / `kemikalie` / `krv` / `maskine` / `eftersyn` / `paabud` |
| `operation` | enum | `opret` / `ret` / `slet` |
| `maal_id` | uuid, nullable | Rækken der rettes/slettes; null ved `opret` |
| `payload` | jsonb | Foreslået indhold (snapshot, §7) |
| `begrundelse` | text | Forslagsstillerens begrundelse |
| `status` | enum | `afventer` / `godkendt` / `afvist` |
| `afvisning_note` | text, nullable | |
| `created_by` / `created_by_navn` | | Forslagsstiller (navn sættes server-side) |
| `behandlet_at` / `behandlet_by` | | Admin der behandlede |

**RLS:** enhver `authenticated` må `INSERT` (med `created_by = auth.uid()`); man
ser sine egne forslag; admin ser alle og kan behandle. Se §9 for whitelist-baseret
godkendelse.

---

## 5. Beregnede værdier (må aldrig indtastes direkte)

Disse udledes altid — de har ikke et selvstændigt, manuelt redigerbart
"sandhedsfelt":

| Værdi | Formel | Kilde |
|---|---|---|
| `apv_fund.score` | `alvor × sandsynlighed` | Fundets egne felter |
| `apv_fund.risikoniveau` | bånd af `score` | `score` |
| `apv_fund.score_efter` | `alvor_efter × sandsynlighed_efter` | Fundets efter-felter |
| `apv_fund.risikoniveau_efter` | bånd af `score_efter` | `score_efter` |
| `apv_krv.score_foer` / `score_efter` | tilsvarende | KRV-felter |
| `apv_maskiner.seneste_eftersyn` | max(`dato`) af ikke-slettede eftersyn | `apv_eftersyn` |
| `apv_maskiner.naeste_eftersyn` | `seneste_eftersyn + eftersyn_interval_mdr` | eftersyn + interval |

**Risikoniveau-bånd (V1-standard — ikke en uforanderlig forretningsregel):**

| Score | Niveau | Farve (SMU-semantik) |
|---|---|---|
| 1–4 | `lav` | teal (ok) |
| 5–9 | `middel` | orange (advarsel) |
| 10–14 | `hoej` | orange-deep |
| 15–25 | `kritisk` | rød (kun fejl/kritisk) |

Disse tærskler er **V1-standarden**, ikke en fast forretningsregel. Modellen skal
designes, så tærsklerne kan ændres senere **uden stor datamigration**:

- **Lagr kun de rå input** (`alvor`, `sandsynlighed`) — og evt. `score` som ren
  afledning heraf. `risikoniveau` **lagres ikke som en persisteret værdi** bundet
  til de nuværende tærskler.
- **Udled `risikoniveau` on-read** (view / applogik) fra `score` mod en
  **konfigurerbar tærskel-definition** (ét sted — konstant, konfigtabel eller
  view). At ændre båndene bliver da en ændring af den definition, ikke en
  omskrivning af hver fund-række.
- Undgå en persisteret generated column på `risikoniveau`, netop fordi en
  tærskelændring så ville kræve migrering/genberegning af eksisterende data.

Uanset hvor niveauet udledes: **indtastning af score/niveau er ikke tilladt** —
kun `alvor` og `sandsynlighed` indtastes.

---

## 6. Statusflows

**Fund** (`apv_fund.status`)
```
ny → i_gang → loest → lukket
        └────→ risiko_accepteret → lukket
```
- `risiko_accepteret` = restrisikoen er bevidst accepteret uden yderligere tiltag.
- Kun admin skifter status gældende (via godkendt forslag eller direkte).

**Handling** (`apv_handlinger.status`)
```
planlagt → i_gang → faerdig
   └──────────────→ annulleret
```

**Påbud** (`apv_paabud.status`)
```
modtaget → i_gang → afventer_at → afsluttet
```
- `afventer_at` = tilbagemelding sendt, afventer myndighedens svar.

**Eftersyn** har ikke et statusflow — hver post er en afsluttet kendsgerning med et
`resultat` (`ok` / `anmaerkning` / `kasseret`).

**Forslag** (`apv_forslag.status`)
```
afventer → godkendt
   └─────→ afvist
```

Alle enums håndhæves med `CHECK`-constraints i databasen.

---

## 7. Levende data vs. snapshot

| Data | Karakter |
|---|---|
| **Levende** | Fund, handling, påbud, maskine, kemikalie, område — de autoritative rækker opdateres over tid (status, felter). Afledte værdier (score, seneste/næste eftersyn) beregnes altid on-read fra levende kilder. |
| **Snapshot** | **Eftersynsposter** (`apv_eftersyn`) er historiske kendsgerninger — rettes normalt ikke; nyt eftersyn = ny post. **`apv_forslag.payload`** er et øjebliksbillede af, hvad forslagsstilleren foreslog; det ændrer sig ikke, når/hvis den autoritative række senere ændres. Ved godkendelse *anvendes* payload på den typed tabel, men payload selv forbliver et historisk snapshot af forslaget. |

Konsekvens: eftersynsloggen og forslagshistorikken kan læses som revisionsspor,
mens de levende domænetabeller altid viser den aktuelle sandhed.

---

## 8. Felter der IKKE må kunne redigeres direkte

- **`apv_fund.score`, `risikoniveau`, `score_efter`, `risikoniveau_efter`** —
  beregnet af alvor × sandsynlighed.
- **`apv_krv.score_foer`, `score_efter`** — beregnet.
- **`apv_maskiner.seneste_eftersyn`, `naeste_eftersyn`** — udledt af
  eftersynsloggen + interval; intet manuelt sandhedsfelt.
- **Audit-felter** (`created_*`, `updated_*`) — sættes af system/RLS, ikke af
  brugerinput.
- **`apv_forslag.created_by_navn`** — sættes server-side fra `profiler`, kan ikke
  spoofes af klienten.
- **`apv_forslag.status`/`behandlet_*`** — kun via admin-godkendelse, ikke fri
  redigering.

---

## 9. Forslag → godkendelse: whitelist, ikke generisk motor

Det generiske `apv_forslag.payload jsonb` er godkendt som **transport**. Selve
anvendelsen er **eksplicit og typed** — ikke en dynamic-SQL-motor der skriver
vilkårligt ud fra tabelnavn + JSON.

`apv_godkend_forslag(forslag_id)` (SECURITY DEFINER, kun admin) arbejder med en
**whitelist**:

1. **Tilladte entiteter:** kun `fund`, `handling`, `omraade`, `kemikalie`, `krv`,
   `maskine`, `eftersyn`, `paabud`. Ukendt entitet → afvises.
2. **Tilladte operationer:** kun `opret`, `ret`, `slet` (`slet` = sæt `slettet=true`).
3. **Tilladte/forventede felter pr. entitet:** kun eksplicit navngivne, redigerbare
   kolonner mappes fra payload. Beregnede felter (§8), audit-felter og fremmede
   nøgler valideres/ignoreres jf. hver entitets whitelist. FK-værdier
   (`omraade_id`, `kemikalie_id`, `ansvarlig_id` …) valideres mod eksisterende
   rækker.
4. **Skrivning sker mod den typed domænetabel** med typed kolonner — payload er
   aldrig sandheden.

Resultat: fleksibiliteten i én forslags-indbakke, uden at give op på
type-sikkerhed eller åbne for vilkårlig databaseskrivning.

---

## 10. Relationsoversigt

```
apv_omraader ──1:N──> apv_fund ──1:N──> apv_handlinger <──N:1── apv_paabud
                          │
                          └─ risikovurdering (indlejrede felter, 1:1)

apv_kemikalier ──1:N──> apv_krv
apv_maskiner   ──1:N──> apv_eftersyn
apv_omraader   ──1:N──> apv_maskiner

profiler ──> ansvarlig_id (fund, handling, paabud, maskine)
profiler ──> udfoert_af_id (eftersyn)
profiler ──> created_by / updated_by (alle)

apv_forslag ──(entitet + maal_id)──> løs reference til enhver domæneentitet;
              anvendes typed via apv_godkend_forslag() (whitelist)
```

**Kardinalitet, kort:**
- Fund 1—N Handlinger · Fund N—1 Område
- Påbud 1—N Handlinger
- Kemikalie 1—N KRV
- Maskine 1—N Eftersyn · Maskine N—1 Område
- Profil 1—N (ansvarlig/udført-af/audit) på tværs
