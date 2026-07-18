# Modul: akademie

## Zweck
Onboarding- und Weiterbildungs-Player: Module → Lektionen (Video + Markdown) →
Mini-Test → Fortschritt. Freischaltung nach Rolle über `min_role` pro Modul.

## Tabellen
`akademie_module` · `akademie_lektionen` · `akademie_tests` · `akademie_fortschritt`
— siehe [docs/SCHEMA.md](../../../docs/SCHEMA.md).

## Migrationen
- `supabase/migrations/0003_akademie.sql` — Tabellen, Enum `akademie_kategorie`, RLS

## Freischaltung — läuft komplett über RLS
`akademie_module` liefert pro Partner nur, was seine Rolle sehen darf
(`rolle_rang(meine_rolle()) >= rolle_rang(min_role)`). Lektionen und Tests erben
das über ihr Modul. Die API unterscheidet deshalb bewusst **nicht** zwischen
„existiert nicht" und „nicht freigeschaltet" — ein `null`-Ergebnis heisst beides,
damit ein gesperrtes Modul nicht mehr über sich verrät als nötig.

## Seiten (Routen in `App.tsx`)
- `/akademie` → `ModulListe.tsx` — freigeschaltete Module, gruppiert nach
  Kategorie, mit Fortschrittsbalken
- `/akademie/modul/:modulId` → `LektionListe.tsx` — Lektionen eines Moduls,
  Haken bei abgeschlossenen
- `/akademie/lektion/:lektionId` → `LektionSeite.tsx` — Video (YouTube-Embed),
  Markdown-Inhalt, Mini-Test, „Weiter"-Navigation zur nächsten Lektion

## Mini-Test — Ablauf
Eine Lektion mit Tests gilt erst als abgeschlossen, wenn **alle** Fragen richtig
beantwortet sind (strikt, kein Teilbestehen). Ohne Tests reicht ein Klick auf
„Als abgeschlossen markieren". Beides schreibt über `lektionAbschliessen()` in
`akademie_fortschritt` (Upsert auf `partner_id, lektion_id`).

> `richtige_antwort` ist laut RLS-Doku (0003) bewusst für jeden mitlesbar, der
> die Lektion sehen darf — kein Server-seitiges Verstecken. Für eine interne
> Lern-Akademie ist das in Ordnung, siehe Kommentar in der Migration.

## Verwaltung (`admin/`) — nur master
Master-UI zum Pflegen der Inhalte, ohne Code (Session 3). Erreichbar über den
„Verwalten"-Button auf `/akademie` (nur für master sichtbar).

- `/akademie/verwaltung` → `VerwaltungModulListe.tsx` — Module anlegen,
  sortieren (↑/↓ innerhalb der Kategorie), löschen
- `/akademie/verwaltung/modul/:id` → `ModulEditor.tsx` — Modul-Stammdaten
  (Titel, Beschreibung, Kategorie, `min_role`) + Lektionen anlegen/sortieren/löschen
- `/akademie/verwaltung/lektion/:id` → `LektionEditor.tsx` — Video-Link (mit
  YouTube-Erkennung), Markdown (mit Vorschau) + Tests (Frage, dynamische
  Antwortliste, richtige Antwort per Radio)
- `admin/felder.tsx` — geteilte Formularfelder (Feld, Textbereich, Auswahl,
  MiniButton), damit die drei Editoren nicht dieselben Klassen wiederholen

Alle Routen sind mit `Geschuetzt min_role="master"` gesperrt (UI-Gating). Die
**verbindliche** Sperre sind die `akademie_*_alles_master`-RLS-Policies aus 0003:
ein Nicht-Master bekommt vom Server einen Fehler, egal was das UI zulässt.

Das Test-Formular erzwingt clientseitig, was die DB-CHECKs verlangen: mindestens
zwei nicht-leere Antworten und ein gültiger `richtige_antwort`-Index — sonst käme
nur eine kryptische Postgres-Meldung zurück.

## API (`api.ts`)
Player: `moduleMitFortschrittLaden` · `modulLaden` · `lektionenMitFortschrittLaden` ·
`lektionLaden` · `testsLaden` · `eigenenFortschrittLaden` · `lektionAbschliessen`

Verwaltung (master): `alleModuleLaden` · `lektionenLaden` · `modulAnlegen` ·
`modulAktualisieren` · `modulLoeschen` · `lektionAnlegen` · `lektionAktualisieren` ·
`lektionLoeschen` · `testAnlegen` · `testAktualisieren` · `testLoeschen` ·
`reihenfolgeTauschen`

Komponenten importieren **nie** `supabase` direkt (CLAUDE.md, Merge-Regel 3).

## Sonstiges
- `youtube.ts` — reine Funktion, wandelt watch/youtu.be/shorts-Links in eine
  `youtube-nocookie.com`-Embed-URL um. Kein Supabase-Bezug, für sich testbar.
- `MarkdownInhalt.tsx` — rendert `inhalt_markdown` über `react-markdown` +
  `remark-gfm`, gestylt über die Component-Map (kein `@tailwindcss/typography`,
  damit nur die vier Design-Tokens aus CLAUDE.md verwendet werden).

## Abhängigkeiten
- `@/lib/supabase`, `@supabase/supabase-js`
- `@/modules/auth` (Partner-ID, `useAuth()`)
- `react-markdown`, `remark-gfm`
- `react-router-dom`

## Offen
- Sortieren läuft über ↑/↓-Buttons (zwei Einzel-Updates). Drag-and-drop wäre
  schöner, aber für einen Master als einzigen Nutzer unnötig.
- Kein Rich-Text-Editor für Markdown — bewusst Roh-Markdown mit Live-Vorschau.
- Bild-Uploads (Storage) für Lektionsinhalte noch nicht angebunden.
