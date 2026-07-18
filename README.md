# Struktur OS

Interne Web-App für den Finanzvertrieb: Onboarding-Akademie, Master-Dashboard mit
Zielen und Einheiten, Rollen-Freischaltung, automatische Workflows, KI-Namensliste.

Ziel: Einarbeitung pro Partner von 2 Tagen auf null, 50 starke GPs aufbauen.

## Stack
React + Vite + TypeScript · Tailwind v4 · Supabase (Auth, Postgres, RLS, Edge Functions)
· Netlify

## Setup

```bash
npm install
cp .env.example .env.local   # mit Supabase-Projektdaten füllen
npm run dev
```

Ohne `.env.local` startet die App bewusst nicht — `src/lib/supabase.ts` wirft dann
mit einem Hinweis.

### Datenbank

```bash
supabase link --project-ref <ref>
supabase db push          # Migrationen einspielen
supabase db reset         # LOKAL: neu aufsetzen + seed.sql
```

Demo-Accounts aus `supabase/seed.sql` (nur lokal), Passwort `struktur-demo-2026`:
`master@struktur.test` · `fk@struktur.test` · `gp2@struktur.test` · `gp@struktur.test`

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Dev-Server |
| `npm run build` | `tsc -b && vite build` — muss fehlerfrei sein |
| `npm run lint` | oxlint |

## Aufbau

```
src/modules/<name>/    Feature-Module, je mit README.md und api.ts
src/lib/               Client-Setup (nur Module greifen darauf zu)
src/components/        Geteilte UI
supabase/migrations/   Schema als SQL — nie im Dashboard klicken
docs/SCHEMA.md         Schema-Doku inkl. Begriffen
docs/PROGRESS.md       Was ist fertig, was offen
```

Konventionen und verbindliche Regeln: [CLAUDE.md](CLAUDE.md).

## Stand
Auth und Rollen (`master > fuehrungskraft > gp_stufe2 > gp_frisch`) stehen.
Akademie, Dashboard und Namensliste sind offen — siehe [docs/PROGRESS.md](docs/PROGRESS.md).
