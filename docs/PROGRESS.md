# Fortschritt

Stand: 2026-07-18

---

## Fertig

### Modul `namensliste` + KI-Interview (Session 7)
Ein neuer GP baut seine Namensliste über ein geführtes KI-Interview auf und pflegt
Kontakte mit ABC-Kategorie — „ohne euch".

- **Migration 0005**: Tabelle `kontakte` (Name, ABC-Kategorie, Beziehung, Telefon,
  Notiz, Status) mit RLS (eigene CRUD, Struktur liest mit, master alles).
- **Edge Function** `namensliste-interview` (Deno + **Anthropic-SDK**): geführtes
  Interview, Frage für Frage. Reine Logik (`logik.ts`) getrennt vom Handler.
  Modell-Default `claude-opus-4-8`, per Env `ANTHROPIC_MODELL` übersteuerbar;
  System-Prompt als Cache-Prefix, `effort: low`, `refusal`-Guard, CORS. Der
  `ANTHROPIC_API_KEY` lebt als Supabase-Secret, nie im Frontend.
- **Frontend** `src/modules/namensliste/`: Tabs „Liste" (Kontakte nach A/B/C,
  Kategorie/Status ändern, löschen) und „KI-Interview" (Chat + Schnell-Hinzufügen).
  Ersetzt den Platzhalter `src/seiten/Namensliste.tsx`.
- **Verifiziert**: Migration 0005 gegen echtes Postgres (8/8 — CHECKs + RLS).
  Deno: `deno check` (inkl. Anthropic-SDK) sauber, `deno test` 7/7. Frontend
  Build/Lint grün, Playwright-E2E 16/16 (Kontakte-CRUD + Interview mit gemockter
  Function).
- **Bewusst nicht live**: Interview nicht real gegen Anthropic getestet — braucht
  Deploy + `ANTHROPIC_API_KEY` (Audit-Phase, siehe Function-README). Die KI
  erfindet keine Kontakte (System-Prompt); der GP trägt Namen selbst ein.

### Workflows — Onboarding-Erinnerungen (Session 6)
Automatische Erinnerungen: täglicher Cron liest fällige `onboarding_trigger` und
schickt je `trigger_typ` eine Resend-Mail mit Tutorial-Link an den Partner.

- **Migration 0004**: `onboarding_trigger.erinnerung_gesendet_am` (Idempotenz) +
  Konfig-Tabelle `onboarding_vorlagen` (Betreff/Inhalt/Link/`aktiv` je Typ) mit
  **inaktiven ENTWURF-Platzhaltern** — nichts sendet, bis echte Inhalte da sind.
- **Edge Function** `supabase/functions/onboarding-erinnerungen/` (Deno):
  reine Logik (`logik.ts`) getrennt vom Handler (`index.ts`). Sendet nur bei
  sendbereiter Vorlage (aktiv + URL), markiert erst nach erfolgreichem Versand,
  HTML-Escaping im Body, Endpunkt per `CRON_SECRET` geschützt.
- **Verifiziert**: Migration 0004 gegen echtes Postgres (8/8 grün — Cron-Abfrage,
  Idempotenz, CHECK, RLS). Deno: `deno check` sauber, `deno test` 11/11 grün
  (u. a. „ENTWURF sendet nie" und XSS-Escaping). Frontend unberührt, Build/Lint grün.
- **Bewusst nicht live**: `0004` noch nicht gepusht, Function nicht deployed, keine
  echten Vorlagen-Inhalte/Keys — alles in der Setup-Checkliste
  (`supabase/functions/onboarding-erinnerungen/README.md`) für die Audit-Phase.

Offen (Vertriebslogik, nicht geraten):
- Echte Vorlagen-Texte + Tutorial-Links je `trigger_typ`.
- Wer/was legt `onboarding_trigger` an (Ereignis + Frist)? Eine Master-UI dafür
  fehlt noch — Trigger entstehen bisher nur per SQL/Seed.

### Modul `kalender` (Session 5)
Eigener Kalender + To-dos — jeder Partner verwaltet seine Termine (Beratung,
Nachfassen, Rekrutierung, Sonstiges) und offenen Aufgaben. Kein neues Schema:
nutzt `termine`/`todos` (0002). Ersetzt den Platzhalter `src/seiten/Kalender.tsx`
(gelöscht).

- `types.ts` — Termin/Todo-Typen + exakte CHECK-Werte aus 0002 (`typ`, `status`,
  `quelle`) mit deutschen Labels
- `gruppierung.ts` — reine, testbare Sortier-/Gruppierlogik: kommende/vergangene
  Termine (chronologisch), Gruppierung nach Kalendertag („Heute"/„Morgen"/
  Wochentag), überfällige To-dos, offene/erledigte Sortierung
- `format.ts` — deutsche Uhrzeit-/Datumsformatierung, `datetime-local` ⇄ ISO
- `api.ts` — Termine/Todos laden, anlegen, Status/erledigt ändern, löschen;
  arbeitet ausschliesslich mit dem eigenen Partner (Session-Scope, siehe „Offen")
- `KalenderSeite` (`/kalender`, alle Rollen, kein `min_role`) — zwei Bereiche:
  **Termine** (Liste, kommende zuerst, nach Tag gruppiert, Vergangene
  eingeklappt, Status per Dropdown direkt in der Zeile, Anlegen/Löschen) und
  **To-dos** (offen/erledigt getrennt, erledigt eingeklappt, überfällige
  `faellig_am < heute` rot markiert, Anlegen/Abhaken/Löschen)
- Rechte streng nach RLS (0002): jeder schreibt nur eigene Zeilen; das UI
  spiegelt das (keine Fremdvergabe/Struktur-Sicht im UI), obwohl die RLS bei
  `todos` INSERT für die Struktur und bei beiden Tabellen Lesen für die
  Struktur schon erlaubt — bewusst zurückgestellt (siehe „Offen")
- **Dashboard-Anbindung**: `dashboard/api.ts` zählt zusätzlich `termine` je
  Partner im Monat (alle Status) und stellt sie `ziel_termine` gegenüber;
  `DashboardSeite.tsx` zeigt das als dritte Kennzahl (Balken Ist/Soll) neben
  Einheiten und Akademie. `PartnerUebersicht` um `zielTermine`/`istTermine`
  erweitert.
- **End-to-end getestet** (Playwright, statefuler Mock, `page.route()`-Muster
  wie Session 4): Termin anlegen → in der Liste sichtbar (Typ + Uhrzeit) →
  Status auf „Stattgefunden" ändern → löschen → Leerzustand kehrt zurück.
  To-do mit `faellig_am` = gestern anlegen → als „überfällig" markiert →
  abhaken → verschwindet aus offen, taucht unter „Erledigte anzeigen" auf →
  löschen. Dashboard zeigt „2 / 3" für ein Teammitglied mit zwei Terminen im
  Monat gegen ein Ziel von 3. 22/22 Prüfungen grün, keine JS-Fehler.
- `npm run build` und `npm run lint` laufen fehlerfrei.

**Bewusst nicht gebaut/geraten:** „Pflicht-Aufgaben je Rolle" (aus dem
Fahrplan erwähnt) ist ungeklärte Vertriebslogik — welche To-dos/Termine sind
je Rolle verpflichtend, wer legt sie fest, welche Fristen gelten? Nicht
erfunden (CLAUDE.md: „Bei Unsicherheit über Vertriebslogik: FRAGEN, nicht
raten"), als offene Frage unten aufgeführt.

### Modul `dashboard` (Session 4)
„Wer liefert, wer hängt" — Master + Führungskraft sehen pro Monat/Partner das Ist
gegen Soll. Kein neues Schema: nutzt `ziele`/`einheiten` (0002) + Akademie-Fortschritt.

- `monat.ts` — reine Monats-Helfer (`YYYY-MM`), Logik-getestet inkl. Jahresgrenzen
- `api.ts` — Monatsübersicht (Ist-Summe + Ziel + Akademie verfügbar/abgeschlossen),
  Ziel-Upsert, Einheit erfassen/löschen; wandelt numeric-Strings via `Number(...)`
- `DashboardSeite` (`/dashboard`) — Team-Übersicht mit Monats-Nav, eigene Zeile
  ausgeblendet, roter „0 Einheiten"-Marker bei gesetztem Ziel ohne Ist
- `PartnerDetail` (`/dashboard/partner/:id?monat=`) — Ist-Summe, Ziel-Formular
  (master) bzw. -Anzeige (FK), Einheiten erfassen/löschen (master)
- Rechte streng nach RLS (0002): Einheiten schreibt nur master, Ziele nur master
  oder der Partner selbst — FK sieht read-only
- Nur echte Ist-Zahlen (Einheiten, Akademie); für Neuanmeldungen bewusst kein Ist
- **End-to-end getestet** (Playwright, statefuler Mock): Übersicht (4/12, Akademie
  2/3 bzw. 1/2), Ziel-Upsert, Einheit erfassen → Ist steigt → löschen → Ist sinkt.
  16/16 grün.

**Nebenbei ein echter Bug gefixt:** `eigenenPartnerLaden` (auth) lud die eigene
partner-Zeile ohne `user_id`-Filter und verließ sich auf die RLS. Für master und
Führungskraft liefert die RLS aber mehrere Zeilen → `.maybeSingle()` wäre mit
PGRST116 gebrochen, sobald mehr als ein Partner existiert. In Produktion (bisher
nur 1 Partner) noch nicht aufgetreten, aber ein sicherer Login-Ausfall, sobald
eine Struktur da ist. Jetzt filtert die Funktion explizit nach `user_id`.

### Akademie-Verwaltung (Session 3)
Master-only UI zum Pflegen der Inhalte **ohne Code** — im Modul `akademie`
unter `admin/`. Kein neues Schema: die Schreibrechte kommen aus den bestehenden
`akademie_*_alles_master`-RLS-Policies (0003).

- `admin/api`-Erweiterungen: CRUD für Module/Lektionen/Tests + `reihenfolgeTauschen`
- `VerwaltungModulListe` (`/akademie/verwaltung`) — Module anlegen/sortieren/löschen
- `ModulEditor` (`.../modul/:id`) — Stammdaten + `min_role` + Lektionen verwalten
- `LektionEditor` (`.../lektion/:id`) — Video (YouTube-Erkennung), Markdown mit
  Vorschau, Tests (dynamische Antwortliste, richtige Antwort per Radio, erzwingt
  die DB-CHECKs schon im Formular)
- Zugang über „Verwalten"-Button auf `/akademie`, nur für master
- Alle Routen `Geschuetzt min_role="master"`; RLS sperrt verbindlich
- **End-to-End getestet** (Playwright, statefuler PostgREST-Mock): Master legt
  Modul → Lektion → Video/Markdown → Test an; Fremdschlüssel, `reihenfolge` und
  Antwort-Index landen korrekt. 22/22 grün. Zusätzlich Gating geprüft:
  `gp_frisch` sieht keinen Button und wird auf `/akademie/verwaltung` geblockt.
- Damit lassen sich echte Akademie-Inhalte jetzt einpflegen (offene Vertriebsfrage).

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
- Platzhalter-Seiten unter `src/seiten/`: Dashboard, Akademie, Namensliste
  (Kalender ist seit Session 5 ein echtes Modul, kein Platzhalter mehr)

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
7. **Pflicht-Aufgaben je Rolle** (Session 5) — der Fahrplan erwähnt „Pflicht-
   Aufgaben je Rolle" für Kalender/To-dos. Unklar: welche To-dos/Termine sind
   für welche Rolle verpflichtend, wer legt sie fest (Master? automatisch?),
   welche Fristen gelten? Nicht gebaut/geraten — `kalender`-Modul deckt aktuell
   nur freie, selbst verwaltete Termine/To-dos ab.

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
1. **Session 8 — KI-Insights**: Edge Function analysiert Ziele vs. Ist und schreibt
   Handlungsempfehlungen ins Master-Dashboard.
2. **Session 9** — Benefits/Polish (Three.js-Showpiece, Feinschliff).
3. **Audit-Phase** (vom Nutzer gewünscht): alle Sessions gemeinsam durchgehen und
   manuell adjustieren — inkl. Infra-Deploys, die bewusst offen sind:
   - `supabase db push` für Migrationen 0004/0005 (+ spätere)
   - Edge Functions deployen + Secrets setzen:
     - `onboarding-erinnerungen`: Resend/CRON_SECRET, Vorlagen füllen + aktivieren, Cron
     - `namensliste-interview`: `ANTHROPIC_API_KEY` (opt. `ANTHROPIC_MODELL`)
   - echte Akademie-Inhalte einpflegen; offene Vertriebsfragen klären
     (Karrieresystem, Termin-Typen, „Pflicht-Aufgaben je Rolle", Onboarding-Fristen)
   - GitHub-Push (Token + git-Name) — steht seit Session 3 aus

## Offen im Dashboard (bewusst später)
- Struktur-Aggregation über eine ganze Downline (Summe pro Teilbaum) — aktuell
  ist die Übersicht pro Partner.
- Termine-Ist steht nur auf der Übersicht (`DashboardSeite.tsx`), noch nicht in
  `PartnerDetail.tsx`.
