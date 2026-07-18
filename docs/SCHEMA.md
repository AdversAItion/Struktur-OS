# Datenbank-Schema

Stand: Migrationen `0001` – `0003`.
**Nach jeder Migration diese Datei aktualisieren** (CLAUDE.md, Merge-Regel 2).

Alle Schema-Änderungen laufen über SQL-Dateien in `supabase/migrations/` —
nie manuell im Supabase-Dashboard klicken.

| Migration | Inhalt |
|---|---|
| `0001_init_auth_rollen.sql` | Enum `rolle`, Tabelle `partner`, Helfer, Trigger, RLS |
| `0002_struktur_und_vertrieb.sql` | Rekursive Struktur-Sicht, `ziele`, `einheiten`, `termine`, `todos`, `onboarding_trigger` |
| `0003_akademie.sql` | `akademie_module`, `akademie_lektionen`, `akademie_tests`, `akademie_fortschritt` |

---

## Begriffe

| Begriff | Bedeutung |
|---|---|
| **Partner** | Ein Mensch im Vertrieb. Jeder Account ist genau ein Partner. |
| **Upline** | Der Partner, an den ein Partner berichtet. `NULL` = Wurzel der Struktur. |
| **Struktur** | Alle Partner unterhalb einer Führungskraft — die gesamte rekursive Downline, nicht nur die direkte Ebene. |
| **Rolle** | Was ein Partner in *dieser App* darf. Vier Stufen, siehe unten. |
| **Stufe** | Karrierestufe im *Ergo-Pro-System*, 1–6. Fachlich, unabhängig von der Rolle. |
| **Einheit** | Die Vertriebs-Kennzahl. Dezimal (Teil-Einheiten kommen vor). Trägt der Master manuell ein. |
| **Ziel** | Was ein Partner sich für einen Kalendermonat vornimmt. Entsteht im Face-to-Face-Gespräch. |

### Rolle vs. Stufe — nicht dasselbe

Zwei getrennte Achsen, die man leicht verwechselt:

- **`rolle`** (`gp_frisch` … `master`) steuert **Rechte**: was jemand sieht und
  ändern darf. Nur hierauf greifen RLS und UI-Gating zu.
- **`stufe`** (1–6) bildet die **Ergo-Pro-Karriere** ab: Repräsentant bis
  Direktionsrepräsentant der Stufe 6. Reine Fachinformation, steuert (noch) keine
  Rechte.

Die Rolle `gp_stufe2` heißt zwar ähnlich, ist aber **nicht** `stufe = 2`.

---

## Enum: `rolle`

| Wert | Rang | Label im UI |
|---|---|---|
| `master` | 40 | Master |
| `fuehrungskraft` | 30 | Führungskraft |
| `gp_stufe2` | 20 | GP Stufe 2 |
| `gp_frisch` | 10 | GP frisch |

Höherer Rang = mehr Rechte. Der Rang steht doppelt: `public.rolle_rang()` (DB, für RLS)
und `ROLLEN_RANG` in `src/modules/auth/types.ts` (UI-Gating). **Synchron halten.**

## Karrierestufen (`partner.stufe`, 1–6)

| Stufe | Bezeichnung |
|---|---|
| 1 | Repräsentant |
| 2 | Leitender Repräsentant |
| 3 | Hauptrepräsentant |
| 4 | Chefrepräsentant |
| 5 | Direktionsrepräsentant der Stufe 5 |
| 6 | Direktionsrepräsentant der Stufe 6 |

In der DB als `smallint` mit `check (stufe between 1 and 6)`, im UI als
`KARRIERESTUFE_LABEL` in `src/modules/auth/types.ts`. **Synchron halten.**

---

## Tabelle: `partner`

Ein Mensch im Vertrieb, 1:1 an einen `auth.users`-Account gekoppelt.

| Spalte | Typ | Notiz |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` UNIQUE NOT NULL | → `auth.users(id)`, `on delete cascade` |
| `name` | `text` NOT NULL | Default `''`, ein Feld (kein Vor-/Nachname getrennt) |
| `email` | `text` | Kopie aus `auth.users` zum Anzeigen |
| `rolle` | `rolle` NOT NULL | Default `gp_frisch` |
| `stufe` | `smallint` NOT NULL | Default `1`, `check between 1 and 6` |
| `upline_id` | `uuid` NULL | → `partner(id)`, `on delete set null`. Selbstreferenz. |
| `aktiv` | `boolean` NOT NULL | Default `true` |
| `aktiv_seit` | `date` NOT NULL | Default `current_date`. Start im Vertrieb — fachlich, bewusst getrennt von `created_at` (Anlegen des Accounts). |
| `created_at` | `timestamptz` NOT NULL | Default `now()` |

Indizes: `partner_user_id_idx`, `partner_upline_id_idx`.

### Automatik
`on_auth_user_created` (Trigger auf `auth.users`) legt bei jeder Account-Anlage
automatisch eine `partner`-Zeile an, `name` aus `raw_user_meta_data ->> 'name'`.
Startrolle ist **immer** `gp_frisch` — Hochstufen macht ausschliesslich ein `master`.

### RLS-Policies

| Policy | Aktion | Regel |
|---|---|---|
| `partner_select_eigene` | SELECT | `user_id = auth.uid()` |
| `partner_select_struktur` | SELECT | Rang ≥ 30 **und** Ziel liegt in der eigenen Downline |
| `partner_select_master` | SELECT | Rang ≥ 40 (master sieht alle) |
| `partner_update_eigene` | UPDATE | Eigene Zeile; `rolle`, `stufe`, `upline_id` unveränderbar |
| `partner_update_master` | UPDATE | Rang ≥ 40 darf alles |

Kein INSERT/DELETE per Policy: INSERT läuft nur über den Trigger, DELETE nur über
die Kaskade von `auth.users`.

### Helfer-Funktionen
`meine_rolle()`, `meine_partner_id()`, `meine_stufe()`, `meine_upline_id()` und
`ist_in_meiner_struktur()` sind alle `SECURITY DEFINER`.

Grund: Eine Policy auf `partner`, die selbst `partner` abfragt, löst sonst rekursiv
wieder die RLS aus (Endlosschleife). `SECURITY DEFINER` umgeht das.

`meine_stufe()` und `meine_upline_id()` gibt es aus einem zweiten Grund: In einer
UPDATE-Policy sieht `with check` nur die **neue** Zeile. Um „Wert darf sich nicht
ändern" zu prüfen, holen diese Funktionen den Altwert aus der DB.

### `ist_in_meiner_struktur(ziel_partner_id)`
Rekursiver CTE, der von `ziel_partner_id` über `upline_id` nach oben läuft.
Trifft er den angemeldeten Partner, liegt das Ziel in dessen Downline.
Der Startknoten selbst ist ausgeschlossen — „eigene Daten" regeln die
`_eigene`-Policies.

Die Rekursion ist auf **50 Ebenen** begrenzt. Das ist eine Zyklus-Bremse: ein
versehentlicher Ring in der Upline-Kette (A → B → A) würde die Query sonst
endlos laufen lassen und jede Abfrage auf `partner` blockieren.

---

## Tabelle: `ziele`

Was ein Partner sich für einen Kalendermonat vornimmt.

| Spalte | Typ | Notiz |
|---|---|---|
| `id` | `uuid` PK | |
| `partner_id` | `uuid` NOT NULL | → `partner(id)`, cascade |
| `monat` | `date` NOT NULL | Immer der **Monatserste** (`check`). Ein Ziel gilt für einen Monat. |
| `ziel_einheiten` | `numeric(6,2)` NOT NULL | Default `0`, `>= 0` |
| `ziel_termine` | `integer` NOT NULL | Default `0`, `>= 0` |
| `ziel_neuanmeldungen` | `integer` NOT NULL | Default `0`, `>= 0` |
| `notiz` | `text` | Was im Face-to-Face-Gespräch besprochen wurde |
| `erstellt_von` | `uuid` | → `partner(id)`, i.d.R. die Führungskraft |
| `created_at` | `timestamptz` NOT NULL | |

UNIQUE `(partner_id, monat)` — ein Ziel pro Partner und Monat.

RLS: lesen eigene + Struktur (Rang ≥ 30) + master; schreiben eigene + master.

## Tabelle: `einheiten`

Die Vertriebs-Kennzahl.

| Spalte | Typ | Notiz |
|---|---|---|
| `id` | `uuid` PK | |
| `partner_id` | `uuid` NOT NULL | → `partner(id)`, cascade |
| `datum` | `date` NOT NULL | Default `current_date` |
| `anzahl` | `numeric(6,2)` NOT NULL | `>= 0`. Dezimal — Teil-Einheiten kommen vor. |
| `quelle` | `text` NOT NULL | Default `manuell`; `manuell` \| `import` |
| `erfasst_von` | `uuid` | → `partner(id)` |
| `created_at` | `timestamptz` NOT NULL | |

RLS: lesen eigene + Struktur; **schreiben nur master** — Einheiten trägt laut
Vorgabe ausschliesslich der Master ein.

## Tabelle: `termine`

| Spalte | Typ | Notiz |
|---|---|---|
| `id` | `uuid` PK | |
| `partner_id` | `uuid` NOT NULL | → `partner(id)`, cascade |
| `datum` | `timestamptz` NOT NULL | |
| `typ` | `text` NOT NULL | `beratung` \| `nachfassen` \| `rekrutierung` \| `sonstiges` |
| `status` | `text` NOT NULL | Default `geplant`; `geplant` \| `stattgefunden` \| `abgesagt` \| `verschoben` |
| `created_at` | `timestamptz` NOT NULL | |

RLS: lesen eigene + Struktur; schreiben eigene + master.

> `typ` und `status` sind `text` + CHECK statt Enum: die Werte werden sich mit dem
> Vertrieb noch ändern, und ein CHECK zu erweitern ist billig, während das Entfernen
> oder Umbenennen eines Enum-Werts ein teurer Umbau ist.

## Tabelle: `todos`

| Spalte | Typ | Notiz |
|---|---|---|
| `id` | `uuid` PK | |
| `partner_id` | `uuid` NOT NULL | → `partner(id)`, cascade |
| `titel` | `text` NOT NULL | nicht leer |
| `faellig_am` | `date` NULL | |
| `erledigt` | `boolean` NOT NULL | Default `false` |
| `quelle` | `text` NOT NULL | Default `selbst`; `selbst` \| `vorgesetzter` \| `system` |
| `erstellt_von` | `uuid` | → `partner(id)` |
| `created_at` | `timestamptz` NOT NULL | |

RLS: lesen eigene + Struktur; schreiben eigene; **INSERT auch für die Struktur**
(eine Führungskraft darf ihrer Downline Aufgaben geben); master alles.

## Tabelle: `onboarding_trigger`

Basis für die späteren automatischen Erinnerungen. Ein Ereignis im Onboarding wird
protokolliert und bekommt eine fällige Folgeaktion.

| Spalte | Typ | Notiz |
|---|---|---|
| `id` | `uuid` PK | |
| `partner_id` | `uuid` NOT NULL | → `partner(id)`, cascade |
| `trigger_typ` | `text` NOT NULL | `fuehrungszeugnis_abgegeben` \| `ihk_angemeldet` \| `vertrag_unterschrieben` \| `erstgespraech_gefuehrt` |
| `ausgeloest_am` | `timestamptz` NOT NULL | Default `now()` |
| `aktion_faellig_am` | `date` NULL | |
| `aktion_erledigt` | `boolean` NOT NULL | Default `false` |
| `created_at` | `timestamptz` NOT NULL | |

Partieller Index auf offene, fällige Zeilen.

RLS: lesen eigene + Struktur; **schreiben nur master** (Verwaltungsvorgang).

> Die Automatik selbst ist **noch nicht gebaut**. Gedacht ist: ein Job liest offene,
> fällige Zeilen und erzeugt daraus `todos` (`quelle = 'system'`) bzw. E-Mails
> über Resend.

---

## Akademie

```
akademie_module  ──1:n──> akademie_lektionen ──1:n──> akademie_tests
                                │
                                └──1:n──> akademie_fortschritt ──n:1──> partner
```

### `akademie_module`

| Spalte | Typ | Notiz |
|---|---|---|
| `id` | `uuid` PK | |
| `titel` | `text` NOT NULL | nicht leer |
| `beschreibung` | `text` | |
| `min_role` | `rolle` NOT NULL | Default `gp_frisch`. **Die Freischaltung.** |
| `reihenfolge` | `integer` NOT NULL | Default `0` |
| `kategorie` | `akademie_kategorie` NOT NULL | Enum, siehe unten |
| `created_at` | `timestamptz` NOT NULL | |

Enum `akademie_kategorie`: `ergo_basics`, `produkte`, `karriere`, `verkauf`,
`anmeldung`, `stufe2`.

### `akademie_lektionen`

| Spalte | Typ | Notiz |
|---|---|---|
| `id` | `uuid` PK | |
| `modul_id` | `uuid` NOT NULL | → `akademie_module(id)`, cascade |
| `titel` | `text` NOT NULL | nicht leer |
| `video_url` | `text` | Unlisted YouTube-Link |
| `inhalt_markdown` | `text` | |
| `reihenfolge` | `integer` NOT NULL | Default `0` |

### `akademie_tests`

| Spalte | Typ | Notiz |
|---|---|---|
| `id` | `uuid` PK | |
| `lektion_id` | `uuid` NOT NULL | → `akademie_lektionen(id)`, cascade |
| `frage` | `text` NOT NULL | nicht leer |
| `antworten` | `jsonb` NOT NULL | JSON-Array **von Strings**, mindestens 2 |
| `richtige_antwort` | `smallint` NOT NULL | **0-basierter Index** in `antworten` |

Zwei CHECKs sichern das ab: `antworten` muss ein String-Array mit ≥ 2 Einträgen
sein, und `richtige_antwort` muss in das Array zeigen — kein Test kann ins Leere
verweisen.

> Die Prüfung „alle Elemente sind Strings" steckt in der Funktion
> `public.ist_string_array(jsonb)`, weil ein CHECK-Constraint in Postgres **keine
> Subquery** enthalten darf. Der Aufruf einer `immutable`-Funktion ist erlaubt.

### `akademie_fortschritt`

| Spalte | Typ | Notiz |
|---|---|---|
| `id` | `uuid` PK | |
| `partner_id` | `uuid` NOT NULL | → `partner(id)`, cascade |
| `lektion_id` | `uuid` NOT NULL | → `akademie_lektionen(id)`, cascade |
| `abgeschlossen_am` | `timestamptz` NULL | |
| `test_bestanden` | `boolean` NOT NULL | Default `false` |

UNIQUE `(partner_id, lektion_id)`.

### RLS der Akademie
- `akademie_module`: sichtbar, wenn `rolle_rang(meine_rolle()) >= rolle_rang(min_role)`.
- `akademie_lektionen` und `akademie_tests`: **erben** die Freischaltung ihres Moduls.
- Pflegen (INSERT/UPDATE/DELETE) darf alle drei ausschliesslich der `master`.
- `akademie_fortschritt`: eigener Fortschritt ist Selbstbedienung, die Struktur
  liest mit, master alles.

> **Bewusste Entscheidung:** `richtige_antwort` ist für jeden mitlesbar, der die
> Lektion sehen darf — wer die Netzwerk-Antwort anschaut, sieht die Lösung. Für eine
> interne Lern-Akademie ist das in Ordnung. Erst wenn Tests prüfungsrelevant werden,
> lohnt sich die Auswertung in einer Edge Function.

---

## Getestet

Migrationen `0001`–`0003` und `seed.sql` wurden gegen echtes Postgres 18
eingespielt (lokaler Wegwerf-Cluster mit nachgebautem `auth.users` und
`auth.uid()`). 23 RLS-Prüfungen laufen grün, u. a.:

- GP sieht nur sich; Führungskraft sieht ihre **zweistufige** Downline, aber nicht
  die Ebene über sich; Master sieht alle.
- Selbst-Hochstufung von `rolle`, `stufe` und `upline_id` wird von der RLS
  abgelehnt; den eigenen Namen darf man ändern.
- `gp_frisch` sieht `stufe2`-Module nicht — auch deren Lektionen und Tests nicht.
- Ein GP kann sich keine Einheiten eintragen.
- Die Zyklus-Bremse fängt einen Ring in der Upline-Kette ab (1 ms statt Hänger).

**Noch nicht gegen echtes Supabase getestet.** Der Stub bildet `auth.uid()` nach,
nicht die echte GoTrue-Auth. Nach `supabase db push` einmal live gegenprüfen.

---

## Offen
- **Namensliste** — Tabellen noch nicht entworfen, braucht eigene Migration.
- **Karrieresystem** — was `gp_frisch` von `gp_stufe2` trennt (Kriterium oder
  manuelle Freischaltung), ist noch offen. Ebenso, ob `stufe` künftig Rechte steuert.
- **Akademie-Inhalte** — Modul-Zuschnitt und Rollen-Zuordnung kommen vom Vertrieb.
