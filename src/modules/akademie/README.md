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

## API (`api.ts`)
`moduleMitFortschrittLaden` · `modulLaden` · `lektionenMitFortschrittLaden` ·
`lektionLaden` · `testsLaden` · `eigenenFortschrittLaden` · `lektionAbschliessen`

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
- Es gibt noch keine Verwaltungs-UI für Module/Lektionen/Tests — Inhalte kommen
  aktuell nur per SQL/Seed rein. Kommt als eigene Session („Akademie-Verwaltung").
- Mehrere Tests pro Lektion sind vom Schema gedeckt und im Player unterstützt,
  aber noch nicht mit echtem Inhalt geprüft (Seed hat nur 1 Test pro Lektion).
