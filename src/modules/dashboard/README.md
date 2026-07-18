# Modul: dashboard

## Zweck
„Wer liefert, wer hängt" — Master und Führungskraft sehen pro Monat und Partner
das Ist gegen das Soll (Einheiten, Termine) und den Akademie-Fortschritt. Der
Master trägt Ziele ein und erfasst Einheiten.

## Tabellen
`ziele` · `einheiten` · `termine` (0002, Termine-Ist seit Session 5) ·
gelesen: `partner`, `akademie_module`, `akademie_lektionen`,
`akademie_fortschritt` (0003). Siehe [docs/SCHEMA.md](../../../docs/SCHEMA.md).

## Rechte — kommen aus der RLS (0002), nicht aus dem UI
- **Lesen**: master alles, Führungskraft ihre Downline, sonst nur eigene Zeile.
- **Einheiten schreiben**: nur master (`einheiten_alles_master`).
- **Ziele schreiben**: nur master oder der Partner selbst (`ziele_*_eigene` /
  `ziele_alles_master`) — eine Führungskraft kann Ziele der Downline **nicht**
  setzen.

Das Dashboard spiegelt das: Erfassen/Eintragen erscheint nur für master
(`darf('master')`). Die Routen sind `Geschuetzt min_role="fuehrungskraft"`; die
verbindliche Sperre ist die RLS.

## Seiten (Routen in `App.tsx`)
- `/dashboard` → `DashboardSeite.tsx` — Team-Übersicht mit Monats-Navigation.
  Einheiten Ist/Soll + Akademie pro Partner. Eigene Zeile ist ausgeblendet.
  Ein roter „0 Einheiten"-Marker zeigt, wer bei gesetztem Ziel noch nichts hat.
- `/dashboard/partner/:id?monat=YYYY-MM` → `PartnerDetail.tsx` — Ist-Summe,
  Ziel-Formular (master) bzw. Ziel-Anzeige (Führungskraft), Einheiten-Liste;
  master kann Einheiten erfassen und löschen.

Der Monat wird als `?monat=YYYY-MM` in der URL geführt und zwischen Übersicht und
Detail durchgereicht.

`InsightsPanel.tsx` (oben in der Übersicht) zeigt die KI-Handlungsempfehlungen aus
Tabelle `insights` (Session 8, Edge Function `insights-generieren`) — priorisiert,
einzeln „erledigt"-bar. Sichtbar nur für Führungskraft/master (RLS 0006).

## Nur echte Zahlen
Ist-Werte gibt es nur, wo eine echte Quelle existiert: **Einheiten** (Summe aus
`einheiten`), **Termine** (Zahl der `termine`-Zeilen im Monat, alle Status —
seit Session 5) und **Akademie** (abgeschlossene vs. für die Rolle verfügbare
Lektionen). Für **Neuanmeldungen** gibt es (noch) keine Ist-Quelle — deshalb
erscheint dafür bewusst kein Ist, nur das Ziel (CLAUDE.md: keine erfundenen Zahlen).

## API (`api.ts`)
`monatsUebersichtLaden` · `partnerLaden` · `zielLaden` · `zielSpeichern` ·
`einheitenLaden` · `einheitErfassen` · `einheitLoeschen` ·
`insightsLaden` · `insightErledigen` (Session 8)

Numerik-Hinweis: `numeric`-Spalten (`ziel_einheiten`, `ziel_termine`, `anzahl`)
kommen als String aus PostgREST — die API wandelt sie via `Number(...)` um.

Termine-Ist zählt **alle** Status (auch `abgesagt`/`verschoben`) — die Zahl
misst vereinbarte Termine, nicht nur wahrgenommene. Schreiben von Termine
passiert nicht in diesem Modul, sondern im Modul `kalender`
([README](../kalender/README.md)).

## Sonstiges
- `monat.ts` — reine Monats-Helfer (`YYYY-MM`), für sich testbar.
- `format.ts` — deutsche Dezimal-/Datumsformatierung.

## Abhängigkeiten
- `@/lib/supabase`, `@supabase/supabase-js`
- `@/modules/auth` (Partner, Rolle/Rang, `useAuth`)
- `react-router-dom`

## Offen
- Struktur-Aggregation (Summe über eine ganze Downline) gibt es noch nicht; die
  Übersicht ist pro Partner, nicht pro Teilbaum.
- Termine-Ist ist nur auf `DashboardSeite.tsx` (Übersicht) angebunden, nicht auf
  `PartnerDetail.tsx` — dort steht bisher nur das Termine-Soll im Ziel-Formular
  bzw. in der Ziel-Anzeige.
