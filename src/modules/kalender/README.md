# Modul: kalender

## Zweck
Eigene Termine und offene To-dos an einem Ort — der Kalender jedes Partners.
Jeder verwaltet für sich, was ansteht (Beratungen, Nachfassen, Rekrutierung) und
was zu tun ist. Läuft komplett über die RLS aus Migration `0002` — kein neues
Schema nötig.

## Tabellen
`termine` · `todos` (0002). Siehe [docs/SCHEMA.md](../../../docs/SCHEMA.md).

## Rechte — kommen aus der RLS (0002), nicht aus dem UI
- **`termine`**: lesen eigene + Struktur (Rang ≥ 30) + master; schreiben
  (insert/update/delete) eigene + master.
- **`todos`**: lesen eigene + Struktur; **insert** eigene + Struktur (eine
  Führungskraft darf ihrer Downline To-dos geben) + master; update/delete
  eigene + master.

**Session 5 nutzt nur den eigenen Ausschnitt**: `api.ts` liest/schreibt
ausschliesslich mit `partnerId = eigener Partner`. Die Struktur-Lesesicht und
die Fremdvergabe von To-dos sind RLS-seitig bereits vorbereitet, aber (noch)
nicht ans UI angebunden — siehe „Offen" unten.

## Seiten (Route in `App.tsx`)
- `/kalender` → `KalenderSeite.tsx` — für **alle Rollen** offen (kein
  `min_role`, jeder hat einen eigenen Kalender). Zeigt zwei Bereiche:
  - **Termine** (`TermineBereich.tsx`): chronologische Liste, kommende zuerst,
    gruppiert nach Kalendertag („Heute" / „Morgen" / Wochentag + Datum).
    Vergangene Termine sind eingeklappt (Zähler + Aufklapp-Button). Anlegen
    (Datum+Uhrzeit, Typ), Status ändern (Dropdown direkt in der Zeile),
    löschen.
  - **To-dos** (`TodoBereich.tsx`): offene und erledigte getrennt, erledigte
    eingeklappt. Anlegen (Titel, Fälligkeit optional), Häkchen zum Abhaken,
    löschen. Überfällige (`faellig_am` < heute, nicht erledigt) sind rot
    markiert mit „überfällig"-Label.

## API (`api.ts`)
`termineLaden` · `terminAnlegen` · `terminStatusAendern` · `terminLoeschen` ·
`todosLaden` · `todoAnlegen` · `todoErledigtSetzen` · `todoLoeschen`

`terminAnlegen` setzt keinen Status — der DB-Default `geplant` greift.
`todoAnlegen` setzt `quelle: 'selbst'` fest (Session 5: nur eigene To-dos).

## Reine Logik (ohne Supabase, für sich testbar)
- `types.ts` — Termin/Todo-Typen + die exakten CHECK-Werte aus `0002`
  (`TERMIN_TYPEN`, `TERMIN_STATUS_WERTE`) plus deutsche Label-Maps.
- `gruppierung.ts` — Sortierung/Gruppierung: `kommendeTermine` /
  `vergangeneTermine` (chronologisch, Stichtag `jetzt` als Parameter),
  `gruppiereNachTag` (Tages-Label), `istUeberfaellig`,
  `sortiereOffeneTodos` / `sortiereErledigteTodos`.
- `format.ts` — Uhrzeit-/Datumsformatierung deutsch, `datetime-local`
  ⇄ ISO-Konvertierung fürs Termin-Formular.

## Dashboard-Anbindung (Session 5)
`dashboard/api.ts` zählt zusätzlich die `termine`-Zeilen je Partner im Monat
(alle Status — die Ist-Zahl zählt vereinbarte Termine, nicht nur
wahrgenommene) und stellt sie `ziel_termine` aus `ziele` gegenüber.
`DashboardSeite.tsx` zeigt das als dritte Kennzahl neben Einheiten und
Akademie. Details: [dashboard/README.md](../dashboard/README.md).

## Abhängigkeiten
- `@/lib/supabase`, `@supabase/supabase-js`
- `@/modules/auth` (`useAuth` für den eigenen Partner)
- Keine Abhängigkeit auf andere Feature-Module (`dashboard` liest umgekehrt
  von `termine`, aber `kalender` selbst ist eigenständig — transplantierbar
  laut CLAUDE.md Merge-Regel 3).

## Offen
- **„Pflicht-Aufgaben je Rolle"** (aus dem Fahrplan erwähnt): ungeklärte
  Vertriebslogik — welche To-dos/Termine sind für welche Rolle verpflichtend,
  wer legt sie fest, gibt es Fristen? Bewusst **nicht** gebaut/geraten
  (CLAUDE.md: „Bei Unsicherheit über Vertriebslogik: FRAGEN, nicht raten").
- **Struktur-Sicht**: eine Führungskraft sieht/vergibt aktuell keine Termine
  oder To-dos ihrer Downline im UI, obwohl die RLS es erlaubt (lesend bei
  `termine`, lesend + insert bei `todos`). Bewusst zurückgestellt — im
  Auftrag als „optional/nice-to-have" markiert.
- **`onboarding_trigger`-Automatik**: soll später automatisch `todos` mit
  `quelle = 'system'` erzeugen (siehe `docs/SCHEMA.md`). Noch nicht gebaut.
- Kein Kalender-Rasteransicht (Monatsgitter) — bewusst nur die Liste, da
  90 % der Nutzung mobil ist (CLAUDE.md) und eine Liste dort besser bedienbar
  ist als ein Gitter.
