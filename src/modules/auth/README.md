# Modul: auth

## Zweck
Anmeldung, Session-Handling und Rollen-Gating. Jeder Mensch im Vertrieb ist ein
`partner` und hängt 1:1 an einem `auth.users`-Account.

## Rollen
`master (40) > fuehrungskraft (30) > gp_stufe2 (20) > gp_frisch (10)`

Der Rang steht doppelt: in `types.ts` (`ROLLEN_RANG`) fürs UI-Gating und in
`public.rolle_rang()` in der Datenbank für RLS. **Beide müssen synchron bleiben.**
Autorität ist immer die Datenbank — das UI versteckt nur, die RLS sperrt.

Dasselbe gilt für die Karrierestufen 1–6: `KARRIERESTUFE_LABEL` in `types.ts`
spiegelt den `check (stufe between 1 and 6)` aus `0001`.

> `rolle` und `stufe` sind zwei verschiedene Dinge: die Rolle steuert Rechte in
> dieser App, die Stufe bildet die Ergo-Pro-Karriere ab. Die Rolle `gp_stufe2` ist
> **nicht** `stufe = 2`. Siehe [docs/SCHEMA.md](../../../docs/SCHEMA.md).

## Kein offener Zugang
Es gibt bewusst **keine** `registrieren()`-Funktion und keine Registrierungs-UI.
Accounts legt ausschliesslich der Master an (Supabase Auth → Invite User); der
Trigger `on_auth_user_created` erzeugt daraus die `partner`-Zeile mit Rolle
`gp_frisch`.

**Wichtig:** In den Supabase-Einstellungen muss zusätzlich „Allow new users to
sign up" aus sein. Sonst bleibt der Signup-Endpunkt trotz fehlender UI offen —
das Weglassen des Buttons ist keine Sperre.

## Tabellen
- `partner` — siehe [docs/SCHEMA.md](../../../docs/SCHEMA.md)

## Migrationen
- `supabase/migrations/0001_init_auth_rollen.sql` — Enum, Tabelle, Helfer, RLS
- `supabase/migrations/0002_struktur_und_vertrieb.sql` — `ist_in_meiner_struktur()`
  und die Policy „Führungskraft sieht ihre Downline" auf `partner`

## Komponenten
- `AuthProvider.tsx` — Context, hält Session + Partner. Dünn, keine Logik.
- `LoginSeite.tsx` — reine Anmeldung.
- `Geschuetzt.tsx` — Route-Guard, optional mit `min_role` und/oder `min_stufe`
  (Karrierestufe-Gating; UI-Ebene, verbindlich sperrt die RLS via `meine_stufe()`).
  Kontext bietet dafür `darf(min_role)` und `darfStufe(min_stufe)`; reine
  Vergleichslogik in `hatMindestensRolle` / `hatMindestensStufe`.

## API (`api.ts`)
Alle Aufrufe gegen Supabase laufen hier durch. Komponenten importieren **nie**
`supabase` direkt — so lässt sich das Modul in eine andere App transplantieren.

`anmelden` · `abmelden` · `sessionLaden` · `aufSessionWechselHoeren` ·
`eigenenPartnerLaden(userId)`

> `eigenenPartnerLaden` filtert **explizit** nach `user_id` — nicht auf die RLS
> als Selektor verlassen. Master und Führungskraft sehen per RLS mehrere
> partner-Zeilen; ohne den Filter würde `.maybeSingle()` mit PGRST116 brechen,
> sobald mehr als der eigene Account existiert.

## Abhängigkeiten
- `@/lib/supabase` (Client)
- `@supabase/supabase-js`

Keine Abhängigkeit zu anderen Modulen — `auth` ist die Wurzel, andere Module
hängen an ihm.

## Offen
- Passwort-Reset-Flow.
- Einladen läuft über das Supabase-Dashboard. Soll der Master das aus der App
  heraus können, braucht es eine Edge Function mit `service_role`.
