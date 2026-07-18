# Edge Function: insights-generieren

## Zweck
Täglicher Cron. Analysiert je Partner Ziel vs. Ist (Einheiten, Termine, Akademie)
für den laufenden Monat, bildet **regelbasiert** priorisierte Handlungsempfehlungen
und schreibt sie in `insights` — sichtbar im Master-Dashboard
(„Danny: 0 Einheiten bei Ziel 400 → eingreifen").

## Dateien
- `logik.ts` — reine Regel-Engine (`signaleBilden`, `alleSignale`, `monatsAnteil`).
  Ohne IO, mit `deno test` geprüft (11 Tests).
- `index.ts` — Handler: lädt Kennzahlen (service_role), wendet Regeln an,
  verfeinert optional per KI, schreibt die Insights.
- `logik_test.ts` — Deno-Tests der Regel-Engine.

## Regeln (deterministisch)
- `einheiten_null` (hoch): 0 Einheiten bei gesetztem Ziel, Monat schon > 30 %.
- `hinter_plan` (mittel): Ist-Anteil deutlich unter dem Monatsanteil.
- `keine_termine` (mittel): Termin-Ziel gesetzt, aber 0 Termine.
- `onboarding_stockt` (hoch): frischer GP, Akademie frei, 0 Lektionen.

Die Signale sind **datenbasiert, nicht erfunden** (CLAUDE.md). Früh im Monat
schlagen Rückstände bewusst noch nicht an.

## KI (optional)
Ist `ANTHROPIC_API_KEY` gesetzt, verfeinert Claude die `empfehlung`-Texte in einen
wärmeren Coaching-Ton (ein Aufruf, `effort: low`). **Fällt die KI aus, bleiben die
zuverlässigen Vorlagentexte** — die Insights funktionieren immer, mit oder ohne Key.

## Sicherheit & Idempotenz
- Läuft mit `service_role` (umgeht RLS), geschützt per `CRON_SECRET`.
- Jeder Lauf setzt den Monat frisch (delete + insert) — „Tagesbild". Ein per
  Dashboard erledigtes Insight kommt beim nächsten Lauf wieder, wenn das Problem
  noch besteht (gewollt).
- Das Dashboard liest über die RLS (0006): Führungskraft sieht ihre Struktur,
  master alle, ein GP keine.

## Lokal testen (ohne Deploy)
```bash
deno test supabase/functions/insights-generieren/logik_test.ts
deno check --node-modules-dir=auto supabase/functions/insights-generieren/index.ts
```

## Manuelle Inbetriebnahme — Checkliste (Audit-Phase)
1. **Migration pushen**: `supabase db push` (bringt 0006 / `insights`).
2. **Secrets**:
   ```bash
   supabase secrets set CRON_SECRET=<zufallswert>
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx   # optional (KI-Verfeinerung)
   ```
3. **Deployen** (JWT-Prüfung aus — Auth via CRON_SECRET):
   ```bash
   supabase functions deploy insights-generieren --no-verify-jwt
   ```
4. **Testlauf**:
   ```bash
   curl -X POST "https://<ref>.supabase.co/functions/v1/insights-generieren" \
     -H "x-cron-secret: <CRON_SECRET>"
   # -> {"monat":"...","partnerGeprueft":N,"signale":M,"ki":true|false}
   ```
5. **Cron** (täglich, z. B. 06:00) — wie bei `onboarding-erinnerungen`
   (Supabase Cron-UI oder pg_cron + pg_net mit dem `x-cron-secret`-Header).

## Offen
- Schwellenwerte der Regeln (30 %, 20 %-Abstand) mit dem Vertrieb kalibrieren.
- Optional: On-Demand-Trigger „Jetzt analysieren" für den master aus der App.
