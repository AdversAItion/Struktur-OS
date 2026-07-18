# Edge Function: onboarding-erinnerungen

## Zweck
Täglicher Cron-Job, der fällige `onboarding_trigger` in Erinnerungs-Mails
übersetzt: fälliger Trigger → aktive Vorlage (je `trigger_typ`) → Resend-Mail mit
Tutorial-Link an den Partner. Markiert danach `erinnerung_gesendet_am`, damit
keine Mail doppelt rausgeht.

Läuft server-seitig mit dem `service_role`-Key (umgeht RLS). Der Endpunkt ist per
`CRON_SECRET` geschützt.

## Tabellen (Migration 0004)
- `onboarding_trigger.erinnerung_gesendet_am` — Idempotenz-Stempel.
- `onboarding_vorlagen` — E-Mail-Vorlage je `trigger_typ` (Betreff, Inhalt,
  `tutorial_url`, `aktiv`). Siehe [docs/SCHEMA.md](../../../docs/SCHEMA.md).

## Dateien
- `logik.ts` — reine Logik (E-Mail-Bau, `{{name}}`-Ersetzung, HTML-Escaping,
  `istSendbereit`). Ohne IO, mit `deno test` geprüft (11 Tests).
- `index.ts` — Handler: Zugriffsschutz, DB-Abfrage, Resend-Versand, Markieren.
- `logik_test.ts` — Deno-Tests der reinen Logik.

## Sicherheitsregeln (eingebaut)
- **Kein Versand ohne sendbereite Vorlage**: `aktiv = true` UND `tutorial_url`
  gesetzt. Die ENTWURF-Platzhalter aus 0004 (`aktiv = false`, `url = NULL`) lösen
  also nie eine Mail aus — doppelt abgesichert in `logik.ts` und im Handler.
- **Idempotenz**: gesendet wird nur bei `erinnerung_gesendet_am IS NULL`; markiert
  wird erst nach erfolgreichem Resend-Aufruf.
- **HTML-Escaping** des personalisierten Inhalts (XSS-Schutz im Mail-Body).
- **Zugriffsschutz** über `CRON_SECRET`-Header.

## Lokal testen (nur reine Logik, ohne Deploy)
```bash
deno test supabase/functions/onboarding-erinnerungen/logik_test.ts
deno check supabase/functions/onboarding-erinnerungen/index.ts
```

## Manuelle Inbetriebnahme — Checkliste (für die Audit-Phase)
Diese Schritte brauchen dein Supabase-/Resend-Konto und sind bewusst NICHT
automatisiert.

1. **Migration pushen**: `supabase db push` (bringt 0004 auf das Projekt).
2. **Resend einrichten**: Absender-Domain in Resend verifizieren (SPF/DKIM),
   einen API-Key erzeugen.
3. **Secrets setzen** (nie mit `VITE_` prefixen, leben nur in der Function):
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxx
   supabase secrets set RESEND_ABSENDER="Struktur OS <noreply@deine-domain.de>"
   supabase secrets set CRON_SECRET=<langer-zufallswert>
   ```
   `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` injiziert Supabase automatisch.
4. **Deployen** (JWT-Prüfung aus — die Auth macht das `CRON_SECRET`):
   ```bash
   supabase functions deploy onboarding-erinnerungen --no-verify-jwt
   ```
5. **Vorlagen füllen + aktivieren**: In `onboarding_vorlagen` je `trigger_typ`
   echten Betreff/Inhalt und `tutorial_url` eintragen und `aktiv = true` setzen
   (Supabase-Tabellen-Editor oder SQL). `{{name}}` im Inhalt wird durch den
   Vornamen ersetzt. Solange eine Vorlage inaktiv/ohne URL ist, sendet sie nicht.
6. **Testlauf** (ein fälliger Trigger + aktive Vorlage vorausgesetzt):
   ```bash
   curl -X POST "https://<ref>.supabase.co/functions/v1/onboarding-erinnerungen" \
     -H "x-cron-secret: <CRON_SECRET>"
   # -> {"geprueft":N,"gesendet":M,"uebersprungen":K,"fehler":[]}
   ```
7. **Cron einrichten** (täglich, z. B. 07:00). Zwei Wege:
   - **Supabase Cron-UI** (Dashboard → Integrations/Cron): stündlich/täglich die
     Function mit dem `x-cron-secret`-Header aufrufen.
   - **pg_cron + pg_net** (SQL, Secret aus Vault):
     ```sql
     select cron.schedule(
       'onboarding-erinnerungen-taeglich', '0 7 * * *',
       $$ select net.http_post(
            url    := 'https://<ref>.supabase.co/functions/v1/onboarding-erinnerungen',
            headers:= jsonb_build_object('x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name='cron_secret'))
          ); $$
     );
     ```

## Offen / vom Vertrieb
- **Echte Vorlagen-Inhalte + Tutorial-Links** je `trigger_typ` (die Migration
  legt nur inaktive ENTWURF-Platzhalter an — nichts sendet, bis das gefüllt ist).
- **Wer/was legt `onboarding_trigger` an?** Aktuell entstehen Trigger nur per
  Seed/SQL. Eine Master-UI („Führungszeugnis abgegeben" abhaken → Trigger mit
  Fälligkeit) ist noch nicht gebaut — Fachlogik (welches Ereignis, welche Frist)
  ist offene Vertriebsfrage.
- Optional: aus einem fälligen Trigger zusätzlich ein `todos`-Eintrag
  (`quelle = 'system'`) erzeugen — im Schema schon vorgesehen, hier noch nicht.
