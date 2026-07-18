# Edge Function: namensliste-interview

## Zweck
Geführtes KI-Interview, das einem neuen GP hilft, seine Namensliste aufzubauen.
Das Frontend (`src/modules/namensliste/`) schickt den Chat-Verlauf, Claude liefert
die nächste Frage. Zustandslos — der volle Verlauf kommt bei jedem Aufruf mit.

## Dateien
- `logik.ts` — reine Logik (System-Prompt, Verlauf-Validierung, Mapping ins
  Anthropic-Message-Format, Text-Extraktion). Ohne IO, mit `deno test` geprüft.
- `index.ts` — Handler: CORS, Anthropic-SDK-Aufruf, `refusal`-Guard.
- `logik_test.ts` — Deno-Tests der reinen Logik (7 Tests).

## Anthropic-Nutzung (laut claude-api-Skill)
- Offizielles TS-SDK über `npm:@anthropic-ai/sdk` (nicht raw fetch).
- Modell-Default `claude-opus-4-8`, per Env `ANTHROPIC_MODELL` übersteuerbar
  (z. B. auf ein günstigeres Modell für dieses hochfrequente Chat-Feature).
- System-Prompt als stabiler Cache-Prefix (`cache_control: ephemeral`).
- `output_config.effort: 'low'` — einfaches Q&A, schnell und günstig.
- `stop_reason === 'refusal'` wird vor dem Lesen von `content` abgefangen.

## Sicherheit
- **Kein `ANTHROPIC_API_KEY` im Frontend** — lebt als Supabase-Secret, die Function
  läuft server-seitig.
- Mit Standard-`verify_jwt` deployen: nur angemeldete Nutzer rufen auf
  (`supabase.functions.invoke` hängt das JWT an).
- Die KI erfindet keine Kontakte (System-Prompt) — sie hilft nur beim Erinnern.

## Lokal testen (ohne Deploy)
```bash
deno test supabase/functions/namensliste-interview/logik_test.ts
deno check --node-modules-dir=auto supabase/functions/namensliste-interview/index.ts
```

## Manuelle Inbetriebnahme — Checkliste (Audit-Phase)
1. **Migration pushen**: `supabase db push` (bringt 0005 / `kontakte`).
2. **Secret setzen** (nie mit `VITE_` prefixen):
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
   # optional, günstigeres Modell:
   supabase secrets set ANTHROPIC_MODELL=claude-haiku-4-5
   ```
   `SUPABASE_URL`/`SUPABASE_ANON_KEY` injiziert Supabase automatisch.
3. **Deployen** (JWT-Prüfung an — nur angemeldete Nutzer):
   ```bash
   supabase functions deploy namensliste-interview
   ```
4. **Live testen**: In der App als GP `/namensliste` → Tab „KI-Interview" → auf die
   erste Frage antworten. Die KI sollte mit einer nächsten Frage reagieren.

## Offen
- Modell-/Prompt-Feintuning im Audit (Tonfall, Kategorien-Reihenfolge).
- Optional: KI liefert strukturierte Kontakt-Vorschläge zurück (aktuell trägt der
  GP Namen selbst ein — bewusst, kein fragiles Freitext-Parsen).
