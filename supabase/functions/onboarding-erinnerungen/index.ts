// Edge Function: onboarding-erinnerungen
//
// Läuft per täglichem Cron. Liest fällige onboarding_trigger (fällig <= heute,
// nicht erledigt, noch nicht erinnert), holt die aktive Vorlage je trigger_typ
// und die Partner-E-Mail, schickt die Mail über Resend und markiert den Trigger
// als erinnert (Idempotenz).
//
// Läuft server-seitig mit dem service_role-Key (umgeht RLS). Der Endpunkt ist
// per CRON_SECRET geschützt — Deploy mit `--no-verify-jwt`, die Authentifizierung
// macht das Secret. Setup + Cron: siehe README.md.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { baueMail, istSendbereit, type Vorlage } from './logik.ts'

interface FaelligerTrigger {
  id: string
  trigger_typ: string
  partner: { name: string | null; email: string | null } | null
}

Deno.serve(async (req: Request) => {
  // --- Zugriffsschutz -------------------------------------------------------
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret) {
    return json({ fehler: 'CRON_SECRET nicht konfiguriert' }, 500)
  }
  if (req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ fehler: 'Nicht autorisiert' }, 401)
  }

  // --- Konfiguration --------------------------------------------------------
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const absender = Deno.env.get('RESEND_ABSENDER') // z. B. "Struktur OS <noreply@deine-domain.de>"
  if (!supabaseUrl || !serviceKey || !resendKey || !absender) {
    return json({ fehler: 'Fehlende Umgebungsvariablen (Supabase/Resend/Absender)' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const heute = new Date().toISOString().slice(0, 10)

  // --- Fällige Trigger + Vorlagen laden ------------------------------------
  const { data: trigger, error: triggerFehler } = await supabase
    .from('onboarding_trigger')
    .select('id, trigger_typ, partner:partner_id(name, email)')
    .lte('aktion_faellig_am', heute)
    .eq('aktion_erledigt', false)
    .is('erinnerung_gesendet_am', null)
  if (triggerFehler) return json({ fehler: triggerFehler.message }, 500)

  const faellige = (trigger ?? []) as unknown as FaelligerTrigger[]
  if (faellige.length === 0) return json({ geprueft: 0, gesendet: 0, uebersprungen: 0, fehler: [] })

  const { data: vorlagenRows, error: vorlagenFehler } = await supabase
    .from('onboarding_vorlagen')
    .select('trigger_typ, betreff, inhalt, tutorial_url, aktiv')
  if (vorlagenFehler) return json({ fehler: vorlagenFehler.message }, 500)

  const vorlagen = new Map<string, Vorlage>()
  for (const v of (vorlagenRows ?? []) as Vorlage[]) vorlagen.set(v.trigger_typ, v)

  // --- Senden ---------------------------------------------------------------
  let gesendet = 0
  let uebersprungen = 0
  const fehler: string[] = []

  for (const t of faellige) {
    const vorlage = vorlagen.get(t.trigger_typ)
    // Kein Versand ohne sendbereite Vorlage oder ohne Empfänger-E-Mail.
    if (!istSendbereit(vorlage) || !t.partner?.email) {
      uebersprungen++
      continue
    }

    try {
      const mail = baueMail(vorlage, t.partner)
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: absender,
          to: mail.to,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        }),
      })

      if (!res.ok) {
        fehler.push(`Trigger ${t.id}: Resend ${res.status} ${await res.text()}`)
        continue
      }

      // Erst nach erfolgreichem Versand markieren — sonst würde ein Fehler die
      // Erinnerung dauerhaft verschlucken.
      const { error: updateFehler } = await supabase
        .from('onboarding_trigger')
        .update({ erinnerung_gesendet_am: new Date().toISOString() })
        .eq('id', t.id)
      if (updateFehler) {
        fehler.push(`Trigger ${t.id}: gesendet, aber Markieren fehlgeschlagen (${updateFehler.message})`)
        continue
      }
      gesendet++
    } catch (e) {
      fehler.push(`Trigger ${t.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return json({ geprueft: faellige.length, gesendet, uebersprungen, fehler })
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
