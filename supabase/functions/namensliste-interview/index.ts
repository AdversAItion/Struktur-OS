// Edge Function: namensliste-interview
//
// Geführtes KI-Interview, das einem neuen GP hilft, seine Namensliste aufzubauen.
// Das Frontend schickt den bisherigen Chat-Verlauf, Claude liefert die nächste
// Frage. Zustandslos — der volle Verlauf kommt bei jedem Aufruf mit.
//
// Aufgerufen vom angemeldeten GP (supabase.functions.invoke hängt dessen JWT an);
// mit Standard-verify_jwt deployen. Der ANTHROPIC_API_KEY lebt als Supabase-Secret,
// NIE im Frontend. Setup: siehe README.md.

import Anthropic from 'npm:@anthropic-ai/sdk'
import { SYSTEM_PROMPT, textAusAntwort, verlaufIstGueltig, zuApiMessages, type ChatNachricht } from './logik.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Default laut claude-api-Skill; per Env für die Audit-Phase übersteuerbar
// (z. B. auf ein günstigeres Modell).
const STANDARD_MODELL = 'claude-opus-4-8'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ fehler: 'ANTHROPIC_API_KEY nicht konfiguriert' }, 500)
  const modell = Deno.env.get('ANTHROPIC_MODELL') ?? STANDARD_MODELL

  let verlauf: ChatNachricht[]
  try {
    const body = await req.json()
    verlauf = body.verlauf ?? []
  } catch {
    return json({ fehler: 'Ungültiger Request-Body' }, 400)
  }

  if (!verlaufIstGueltig(verlauf)) {
    return json({ fehler: 'Verlauf muss mit einer Nutzer-Nachricht beginnen' }, 400)
  }

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: modell,
      max_tokens: 1024,
      // Stabiler System-Prompt als Cache-Prefix — spart über die Turns hinweg.
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: zuApiMessages(verlauf),
      // Einfaches Q&A -> niedriger Aufwand hält es schnell und günstig.
      output_config: { effort: 'low' },
    })

    // Vor dem Lesen von content prüfen: Sicherheits-Klassifikator kann ablehnen.
    if (response.stop_reason === 'refusal') {
      return json({ antwort: 'Lass uns bei einer anderen Kategorie weitermachen — wer fällt dir aus deinem Sportverein oder Hobby ein?' }, 200)
    }

    const antwort = textAusAntwort(
      response.content as Array<{ type: string; text?: string }>,
    )
    return json({ antwort })
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      return json({ fehler: `Anthropic API ${e.status}` }, 502)
    }
    return json({ fehler: e instanceof Error ? e.message : String(e) }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
