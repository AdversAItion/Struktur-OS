// Edge Function: insights-generieren
//
// Täglicher Cron. Analysiert je Partner Ziel vs. Ist (Einheiten, Termine,
// Akademie) für den laufenden Monat, bildet regelbasiert priorisierte Signale
// und schreibt sie in `insights` — sichtbar im Master-Dashboard.
//
// Die Signale sind deterministisch (logik.ts). Ist ein ANTHROPIC_API_KEY
// gesetzt, verfeinert die KI zusätzlich die Formulierung; ohne Key bleibt der
// zuverlässige Vorlagentext. Läuft mit service_role (umgeht RLS), geschützt per
// CRON_SECRET. Setup: siehe README.md.

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { alleSignale, monatsAnteil, type PartnerKennzahlen, type Signal } from './logik.ts'

const ROLLEN_RANG: Record<string, number> = {
  master: 40,
  fuehrungskraft: 30,
  gp_stufe2: 20,
  gp_frisch: 10,
}

const CORS = { 'Content-Type': 'application/json' }

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret) return json({ fehler: 'CRON_SECRET nicht konfiguriert' }, 500)
  if (req.headers.get('x-cron-secret') !== cronSecret) return json({ fehler: 'Nicht autorisiert' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ fehler: 'Supabase-Env fehlt' }, 500)
  const supabase = createClient(supabaseUrl, serviceKey)

  const heute = new Date()
  const monat = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, '0')}`
  const monatIso = `${monat}-01`
  const bisIso = `${naechsterMonat(monat)}-01`

  // --- Kennzahlen je Partner zusammentragen ---
  const kennzahlen = await kennzahlenLaden(supabase, monatIso, bisIso)
  const signale = alleSignale(kennzahlen, monatsAnteil(heute))

  // --- Optional: KI verfeinert die Empfehlungstexte ---
  let kiGenutzt = false
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (anthropicKey && signale.length > 0) {
    try {
      await kiVerfeinern(signale, anthropicKey, Deno.env.get('ANTHROPIC_MODELL'))
      kiGenutzt = true
    } catch {
      // KI ist Kür — bei Fehler bleiben die Vorlagentexte.
      kiGenutzt = false
    }
  }

  // --- Schreiben: den Monat frisch setzen (Tagesbild) ---
  const { error: delError } = await supabase.from('insights').delete().eq('monat', monatIso)
  if (delError) return json({ fehler: delError.message }, 500)

  if (signale.length > 0) {
    const rows = signale.map((s) => ({
      partner_id: s.partner_id,
      monat: monatIso,
      typ: s.typ,
      prioritaet: s.prioritaet,
      fakt: s.fakt,
      empfehlung: s.empfehlung,
    }))
    const { error: insError } = await supabase.from('insights').insert(rows)
    if (insError) return json({ fehler: insError.message }, 500)
  }

  return json({ monat, partnerGeprueft: kennzahlen.length, signale: signale.length, ki: kiGenutzt })
})

async function kennzahlenLaden(
  supabase: SupabaseClient,
  monatIso: string,
  bisIso: string,
): Promise<PartnerKennzahlen[]> {
  const [partnerRes, zieleRes, einheitenRes, termineRes, modulRes, lektionRes, fortschrittRes] =
    await Promise.all([
      supabase.from('partner').select('id, name, rolle'),
      supabase.from('ziele').select('partner_id, ziel_einheiten, ziel_termine').eq('monat', monatIso),
      supabase.from('einheiten').select('partner_id, anzahl').gte('datum', monatIso).lt('datum', bisIso),
      supabase.from('termine').select('partner_id').gte('datum', monatIso).lt('datum', bisIso),
      supabase.from('akademie_module').select('id, min_role'),
      supabase.from('akademie_lektionen').select('id, modul_id'),
      supabase.from('akademie_fortschritt').select('partner_id').not('abgeschlossen_am', 'is', null),
    ])

  const partner = (partnerRes.data ?? []) as { id: string; name: string; rolle: string }[]

  const ziele = new Map<string, { einheiten: number; termine: number }>()
  for (const z of (zieleRes.data ?? []) as { partner_id: string; ziel_einheiten: string | number; ziel_termine: string | number }[]) {
    ziele.set(z.partner_id, { einheiten: Number(z.ziel_einheiten), termine: Number(z.ziel_termine) })
  }

  const istEinheiten = new Map<string, number>()
  for (const e of (einheitenRes.data ?? []) as { partner_id: string; anzahl: string | number }[]) {
    istEinheiten.set(e.partner_id, (istEinheiten.get(e.partner_id) ?? 0) + Number(e.anzahl))
  }

  const istTermine = new Map<string, number>()
  for (const t of (termineRes.data ?? []) as { partner_id: string }[]) {
    istTermine.set(t.partner_id, (istTermine.get(t.partner_id) ?? 0) + 1)
  }

  const modulRang = new Map<string, number>()
  for (const m of (modulRes.data ?? []) as { id: string; min_role: string }[]) {
    modulRang.set(m.id, ROLLEN_RANG[m.min_role] ?? 999)
  }
  const lektionen = (lektionRes.data ?? []) as { id: string; modul_id: string }[]

  const abgeschlossen = new Map<string, number>()
  for (const f of (fortschrittRes.data ?? []) as { partner_id: string }[]) {
    abgeschlossen.set(f.partner_id, (abgeschlossen.get(f.partner_id) ?? 0) + 1)
  }

  return partner.map((p) => {
    const rang = ROLLEN_RANG[p.rolle] ?? 0
    const verfuegbar = lektionen.filter((l) => (modulRang.get(l.modul_id) ?? 999) <= rang).length
    const ziel = ziele.get(p.id)
    return {
      partner_id: p.id,
      name: p.name || 'Ohne Namen',
      rolle: p.rolle,
      zielEinheiten: ziel?.einheiten ?? null,
      istEinheiten: istEinheiten.get(p.id) ?? 0,
      zielTermine: ziel?.termine ?? null,
      istTermine: istTermine.get(p.id) ?? 0,
      lektionenAbgeschlossen: abgeschlossen.get(p.id) ?? 0,
      lektionenVerfuegbar: verfuegbar,
    }
  })
}

/**
 * Lässt die KI die `empfehlung`-Texte in einen wärmeren Coaching-Ton bringen —
 * mutiert `signale` in place. Erwartet ein JSON-Array gleicher Länge/Reihenfolge;
 * bei jeder Abweichung bleibt der Vorlagentext (der Aufrufer fängt Fehler ab).
 */
async function kiVerfeinern(signale: Signal[], apiKey: string, modell?: string): Promise<void> {
  const client = new Anthropic({ apiKey })
  const eingabe = signale.map((s, i) => ({ i, fakt: s.fakt, empfehlung: s.empfehlung, prioritaet: s.prioritaet }))
  const response = await client.messages.create({
    model: modell ?? 'claude-opus-4-8',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: 'Du bist Vertriebscoach. Formuliere jede Handlungsempfehlung knapp, konkret und motivierend auf Deutsch (max. 1 Satz). Antworte AUSSCHLIESSLICH mit einem JSON-Array von Strings in derselben Reihenfolge wie die Eingabe — keine weiteren Zeichen.',
        cache_control: { type: 'ephemeral' },
      },
    ],
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: JSON.stringify(eingabe) }],
  })
  const text = (response.content as Array<{ type: string; text?: string }>)
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
  const neu = JSON.parse(text) as unknown
  if (Array.isArray(neu) && neu.length === signale.length) {
    neu.forEach((t, i) => {
      if (typeof t === 'string' && t.trim()) signale[i].empfehlung = t.trim()
    })
  }
}

function naechsterMonat(monat: string): string {
  const [j, m] = monat.split('-').map(Number)
  const d = new Date(j, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS })
}
