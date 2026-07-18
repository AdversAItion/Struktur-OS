# Fortschritt

Stand: 2026-07-18

---

## Fertig

### Modul `akademie` (Session 2 — Akademie-Player)
Modulliste → Lektion (Video + Markdown) → Mini-Test → Fortschritt. Läuft komplett
über die RLS aus Migration `0003` — kein neues Schema nötig.

- `src/modules/akademie/types.ts` — Typen + Kategorie-Label
- `src/modules/akademie/api.ts` — gesamte Supabase-Logik (kein direkter Zugriff
  aus Komponenten). Unterscheidet bewusst nicht zwischen „existiert nicht" und
  „nicht freigeschaltet" — die RLS filtert, die API gibt beides als `null` zurück.
- `src/modules/akademie/youtube.ts` — reine Funktion, wandelt YouTube-Links
  (watch/youtu.be/shorts) in `youtube-nocookie.com`-Embeds
- `src/modules/akademie/MarkdownInhalt.tsx` — rendert `inhalt_markdown` über
  `react-markdown` + `remark-gfm`, gestylt auf die vier CLAUDE.md-Tokens
- Seiten: `ModulListe.tsx` (`/akademie`, gruppiert nach Kategorie mit
  Fortschrittsbalken) · `LektionListe.tsx` (`/akademie/modul/:id`, Haken bei
  abgeschlossenen Lektionen) · `LektionSeite.tsx` (`/akademie/lektion/:id`,
  Video + Markdown + Mini-Test + „Weiter zur nächsten Lektion")
- Mini-Test: alle Fragen müssen richtig beantwortet sein (strikt), sonst
  „Nochmal versuchen". Ohne Test reicht „Als abgeschlossen markieren".
- Routen sind `React.lazy` — `react-markdown` landet in einem eigenen
  48-KB-Chunk statt im Hauptbundle (90 % mobile Nutzung, CLAUDE.md)
- **End-to-End getestet** (Playwright gegen gemockte PostgREST-Endpunkte,
  gp_frisch-Partner): Modul öffnen → Lektion ohne Test abschliessen → zur
  nächsten → Markdown rendert → Test falsch beantwortet (abgelehnt, kein
  Speichern) → richtig beantwortet (Fortschritt gespeichert) → Modulliste
  zeigt 2/2 + „Fertig"-Badge. 18/18 Prüfungen grün, keine JS-Fehler.
- **Ein Bug beim Testen gefunden und gefixt:** „Modul abgeschlossen — zurück
  zur Übersicht" verlinkte auf die Lektionsliste desselben Moduls statt auf
  die Modulübersicht (`/akademie`) — das Label versprach mehr, als der Link
  hielt. Korrigiert.
- Noch **keine** echten Inhalte — weder lokal noch live. Absichtlich: Modul-
  Zuschnitt kommt vom Vertrieb (siehe offene Frage unten), nichts erfunden.

### Fundament
- Vite + React 19 + TypeScript, `strict` an, Pfad-Alias `@/*` → `src/*`
- Tailwind v4 über `@tailwindcss/vite`, Design-Tokens per `@theme` in `src/index.css`
  (Schwarz/Gold, Archivo + Space Mono, `.num` für tabellarische Ziffern)
- Merge-ready-Struktur: `src/modules/`, `src/lib/`, `src/components/`, `src/seiten/`,
  `docs/`, `supabase/migrations/`
- `netlify.toml` (SPA-Redirect, Security-Header, `noindex`)
- `.env.example` — nur `VITE_`-Keys im Frontend
- `npm run build` und `npm run lint` laufen fehlerfrei

### Datenbank (Migrationen 0001–0003)
Alle drei Migrationen + `seed.sql` gegen echtes Postgres 18 getestet, 23 RLS-Prüfungen
grün (Details in `docs/SCHEMA.md`, Abschnitt „Getestet"). **Noch nicht gegen echtes
Supabase gelaufen** — das ist Punkt 1 der manuellen Checkliste unten.

- `0001` — Enum `rolle`, Tabelle `partner` (mit `name`, `stufe` 1–6, `aktiv_seit`),
  Helfer `rolle_rang()` / `meine_rolle()` / `meine_partner_id()` / `meine_stufe()` /
  `meine_upline_id()`, Trigger `on_auth_user_created`, RLS
- `0002` — `ist_in_meiner_struktur()` (rekursiv, mit Zyklus-Bremse),
  `ziele`, `einheiten`, `termine`, `todos`, `onboarding_trigger` je mit RLS
- `0003` — `akademie_module` (Freischaltung über `min_role`), `akademie_lektionen`,
  `akademie_tests`, `akademie_fortschritt` je mit RLS
- `seed.sql` — 4 Demo-Partner über alle Rollen, zweistufige Struktur
  (Mara → Finn → Gina/Jonas) plus Demo-Ziele, -Einheiten, -Termine, -Todos und
  eine Akademie mit drei Modulen über zwei Freischaltstufen

### Modul `auth`
- `api.ts` — gesamte Supabase-Logik, deutsche Fehlermeldungen
- `AuthProvider.tsx` — Session + Partner im Context
- `Geschuetzt.tsx` — Route-Guard mit optionaler `min_role`
- `LoginSeite.tsx` — **nur Anmeldung**, keine Registrierung (Zugang per Einladung)
- `README.md`

### App-Shell
- `src/components/AppShell.tsx` — Seitennavigation ab `md`, Bottom-Bar auf dem Handy
- Nav-Punkte blenden sich nach Rolle aus (Dashboard erst ab `fuehrungskraft`)
- Rollen-Redirect auf `/`: master/fuehrungskraft → `/dashboard`, GPs → `/akademie`
- Platzhalter-Seiten unter `src/seiten/`: Dashboard, Akademie, Kalender, Namensliste

---

## Offen — braucht Input vom Vertrieb

Bewusst nicht geraten (CLAUDE.md: „Bei Unsicherheit über Vertriebslogik: FRAGEN"):

1. **Karrieresystem** — was genau trennt `gp_frisch` von `gp_stufe2`? Automatisch
   nach Kriterium oder manuell durch Master? Und soll `stufe` (1–6) künftig Rechte
   steuern oder reine Fachinformation bleiben?
2. **Akademie-Inhalte** — Modul-Zuschnitt, Reihenfolge, welche Rolle was sieht.
   Der Player steht (Session 2) und ist end-to-end getestet — es fehlen nur
   die echten Module/Lektionen/Tests/Videos. Bis dahin: Datenbank leer.
3. **Termin-Typen** — aktuell geraten: `beratung`, `nachfassen`, `rekrutierung`,
   `sonstiges`. Als CHECK leicht änderbar, aber bitte gegenlesen.
4. **Onboarding-Trigger** — aktuell nur vier Typen hinterlegt. Wie sieht die
   Onboarding-Strecke wirklich aus, und welche Frist hängt an welchem Schritt?
5. **Nav-Sichtbarkeit** — ist die Namensliste wirklich für `gp_frisch` offen?
   Aktuell ja.
6. **Namensliste** — Fachlogik und Tabellen noch komplett offen.

---

## Infrastruktur — steht

- **Supabase-Projekt** `gfjhloqonevxncdlcnuj` („e-space", Region eu-north-1
  Stockholm — nicht Frankfurt wie ursprünglich angedacht, beides EU/DSGVO).
- **Supabase CLI** als devDependency (`npx supabase`), Projekt verlinkt.
- **Migrationen 0001–0003 gepusht** und gegen die echte DB verifiziert:
  10 Tabellen, RLS auf jeder an, 42 Policies, alle Helfer-Funktionen, Trigger,
  beide Enums vorhanden.
- **`config push`**: Auth-Config live. Registrierung ist auf dem echten Projekt
  gesperrt — funktional bewiesen (Signup-Endpoint antwortet `signup_disabled`).
- **`.env.local`** mit echter URL + anon-Key befüllt (gitignored).
- **`seed.sql` NICHT** gegen die Produktion gelaufen (Test-Accounts gehören nur
  in die lokale DB).
- **E-Mail-Login-Provider** per Management-API aktiviert (`external_email_enabled`);
  nicht über `config.toml` schaltbar.
- **Erster Master-Account** live angelegt (Admin-API): `kouyatefalil@gmail.com`,
  Rolle `master`. Login end-to-end getestet (App → echtes Supabase → `/dashboard`).
  Temp-Passwort beim ersten Login ändern.
- **Netlify-Deploy** live: https://loquacious-bavarois-863ab4.netlify.app
  (site_id `ab8010c5-91b3-428c-97bd-1c7b0747ad0a`). Deploy per API (dist-Upload,
  nicht Git-CI). SPA-Routing (`_redirects`), Security-Header (`_headers`) und
  `noindex` auf der Live-Seite verifiziert. Login auf der Produktions-URL getestet.
- Supabase `site_url` + Redirect-URLs auf die Netlify-Domain gesetzt (Remote +
  `config.toml` synchron).

## Offen — technisch

- **Git**: Repo hat noch keinen Commit und kein Remote. Für automatische Netlify-
  Builds bei jedem Push das Repo auf GitHub legen und in Netlify verbinden; aktuell
  ist der Deploy ein manueller dist-Upload.
- **Eigene Domain** statt `loquacious-bavarois-863ab4.netlify.app` (Netlify +
  `site_url` anpassen). Site im Netlify-Dashboard umbenennbar.
- Passwort-Reset-Flow.
- Einladungs-Flow: aktuell lädt der Master über das Supabase-Dashboard ein.
  Später ggf. Edge Function mit `service_role`, damit das aus der App geht.
- Edge Functions (Anthropic für die Namensliste, Resend für Erinnerungen).
- Die Automatik auf `onboarding_trigger` (Job, der fällige Aktionen zu `todos` macht).

> DB-Passwort und Personal Access Token laufen nur zur Laufzeit über Umgebungs-
> variablen — sie stehen in **keiner** Datei im Repo.

---

## Nächste Steps (laut Fahrplan)
1. **Session 3 — Akademie-Verwaltung**: Master-Ansicht, um Module/Lektionen/
   Tests ohne Code anzulegen und `min_role` zu setzen. Erst danach lohnt es,
   echte Inhalte einzupflegen.
2. Antworten auf die offenen Vertriebsfragen oben (blockiert v. a. Karrieresystem
   und Termin-Typen für spätere Sessions).
3. **Session 4 — Dashboard**: `ziele` + `einheiten` stehen bereits aus Migration
   `0002`, nur die UI fehlt.
