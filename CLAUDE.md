# STRUKTUR OS — Projektkontext für Claude Code

## Was wir bauen
Interne Web-App für unseren Finanzvertrieb (Ergo Pro Struktur):
Onboarding-Akademie, Master-Dashboard mit Zielen/Einheiten, Rollen-Freischaltung,
automatische Workflows, KI-Namensliste.
Ziel: Einarbeitung (2 Tage pro Partner) auf null, 50 starke GPs aufbauen.

## WICHTIG — Override zum globalen adversAItion-Standard
Die globale `~/.claude/CLAUDE.md` schreibt Next.js + Vercel und die Lila/Blau-Palette
(`#6C3CE9` / `#3B5FE2`) vor. **Für Struktur OS gilt das ausdrücklich nicht.**
Struktur OS ist eine interne App, kein Kunden-Deliverable. Verbindlich sind der
Stack und das Design aus dieser Datei. Nicht „korrigieren".

## Stack (FEST — nicht ändern ohne Rückfrage)
- Frontend: React + Vite + TypeScript
- Styling: Tailwind CSS (v4, Konfiguration per `@theme` in `src/index.css`)
- Backend: Supabase (Auth, Postgres, RLS, Edge Functions, Storage)
- Hosting: Netlify (`netlify.toml`)
- Video: YouTube unlisted (eingebettet), später ggf. Bunny.net
- KI-Features: Anthropic API über Supabase Edge Functions (Key NIE im Frontend)
- E-Mail: Resend über Edge Functions

## Rollen (Auth)
`master > fuehrungskraft > gp_stufe2 > gp_frisch`

Freischaltung von Inhalten über `min_role` pro Modul + RLS-Policies.
Jeder sieht nur eigene Daten; master/fuehrungskraft sehen ihre Struktur.

Der Rang steht doppelt: `ROLLEN_RANG` in `src/modules/auth/types.ts` (UI-Gating) und
`public.rolle_rang()` in der Datenbank (RLS). **Beide synchron halten.** Autorität ist
immer die Datenbank — das UI versteckt nur, die RLS sperrt.

## Design (FEST)
| Rolle | Hex |
|---|---|
| Hintergrund | `#0B0B0C` |
| Panels | `#141416` |
| Linien | `#28282C` |
| Gold | `#D4AF37` |
| Text | `#F3F0E7` |
| Muted | `#98948A` |

- Als Tailwind-Tokens verfügbar: `bg-bg`, `bg-panel`, `border-line`, `text-gold`,
  `text-text`, `text-muted`.
- Fonts: Archivo (Display/Body) = `font-display` / `font-sans`,
  Space Mono (Zahlen/Labels) = `font-mono`, Utility `.num` für tabellarische Ziffern.
- Mobile-first: 90 % der Nutzung passiert auf dem Handy.
- UI-Sprache: Deutsch, direkt, ohne Füllwörter.

## MERGE-READY-REGELN (WICHTIG — es existiert eine zweite App im Vertrieb)
1. Jedes Feature ist ein Modul unter `src/modules/<name>/` mit eigener `README.md`
   (Zweck, Tabellen, Komponenten, Abhängigkeiten).
2. Datenbank-Schema lebt in `supabase/migrations/` als SQL-Dateien — nie manuell im
   Dashboard klicken. Schema-Doku in `docs/SCHEMA.md` nach jeder Migration aktualisieren.
3. Keine Business-Logik in UI-Komponenten. Logik in `src/modules/<name>/api.ts` — so kann
   ein Modul in eine andere App transplantiert werden. Komponenten importieren **nie**
   `@/lib/supabase` direkt.
4. Deutsche, sprechende Tabellennamen-Doku: was ist ein „partner", eine „einheit", ein
   „ziel" — damit ein fremdes Team es sofort versteht.
5. Seed-Daten in `supabase/seed.sql` für Demo/Tests.

## Arbeitsweise
- Vor jedem Feature: kurzen Plan zeigen, dann bauen.
- Nach jedem Feature: `docs/PROGRESS.md` aktualisieren (Was ist fertig, was offen).
- Bei Unsicherheit über Vertriebslogik (Stufen, Einheiten, Karrieresystem):
  **FRAGEN, nicht raten.**
- Keine Ergo-Logos/Marken hart einbauen — neutrale Platzhalter, Inhalte kommen von uns.

## Befehle
```bash
npm run dev          # Vite Dev-Server
npm run build        # tsc -b && vite build — muss fehlerfrei sein
npm run lint         # oxlint
supabase db reset    # lokale DB neu + migrations + seed.sql
supabase db push     # Migrationen nach remote
```

## Secrets
`.env.local` (gitignored) hält nur `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`.
`service_role`-Key, `ANTHROPIC_API_KEY` und `RESEND_API_KEY` werden **nie** mit `VITE_`
geprefixt und leben ausschliesslich als Supabase-Secrets in Edge Functions.
