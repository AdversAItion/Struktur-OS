# Modul: namensliste

## Zweck
Die „Namensliste" — die Liste aller Menschen, die ein GP kennt. Ein neuer GP baut
sie über ein **geführtes KI-Interview** auf (Frage für Frage durch die
Gedächtnis-Kategorien) und pflegt Kontakte mit **ABC-Kategorie**. Ziel laut
Fahrplan: „Neuer GP baut Namensliste ohne euch."

## Tabelle
`kontakte` (Migration 0005): Name, `kategorie` (A/B/C), Beziehung, Telefon, Notiz,
`status` (offen/kontaktiert). Siehe [docs/SCHEMA.md](../../../docs/SCHEMA.md).

## Rechte — aus der RLS (0005)
Jeder verwaltet seine eigene Liste; die Struktur (Rang ≥ 30) liest mit (Coaching:
„Namensliste voll?"); master darf alles. Das UI zeigt nur die eigene Liste.

## Seite + Komponenten (Route `/namensliste`)
- `NamenslisteSeite.tsx` — Tabs „Liste" / „KI-Interview", lädt die Kontakte.
- `KontaktListe.tsx` — Kontakte nach A/B/C gruppiert (mit Zähler), Kategorie
  ändern, offen/kontaktiert togglen, löschen.
- `Interview.tsx` — Chat mit der KI (Frage für Frage) + Schnell-Hinzufügen, damit
  einfallende Namen sofort in der Liste landen.
- `SchnellHinzufuegen.tsx` — geteiltes „Name + Kategorie → +".

## KI-Interview
Läuft über die Edge Function `namensliste-interview` (Anthropic API). Das Frontend
schickt den Chat-Verlauf, die KI liefert die nächste Frage. Der Verlauf muss für
die API mit einer Nutzer-Nachricht beginnen — der lokale Begrüßungstext (`OPENER`)
ist reine UI und wird in `api.ts` vor dem Senden abgeschnitten.

> **Kein `ANTHROPIC_API_KEY` im Frontend.** Der Key lebt als Supabase-Secret; die
> Function läuft server-seitig. Der GP ruft die Function authentifiziert auf
> (`supabase.functions.invoke` hängt sein JWT an).

## API (`api.ts`)
`kontakteLaden` · `kontaktAnlegen` · `kontaktKategorieSetzen` ·
`kontaktStatusSetzen` · `kontaktLoeschen` · `interviewSenden`

Komponenten importieren **nie** `supabase` direkt (CLAUDE.md, Merge-Regel 3).

## Abhängigkeiten
- `@/lib/supabase`, `@supabase/supabase-js` (inkl. `functions.invoke`)
- `@/modules/auth` (`useAuth`, Partner-ID)

## Offen
- **Interview noch nicht live getestet** — braucht den deployten Edge-Function-
  Endpunkt + `ANTHROPIC_API_KEY` (Audit-Phase, siehe Function-README).
- Feinere Vertriebs-Pipeline pro Kontakt (Termin, Abschluss …) ist noch offene
  Vertriebslogik — `status` ist bewusst schlank (`offen`/`kontaktiert`).
- Optional: KI könnte Namen direkt als Kontakt-Vorschläge zurückgeben; aktuell
  trägt der GP sie selbst über „Schnell-Hinzufügen" ein (robust, kein fragiles
  Parsen von Freitext).
