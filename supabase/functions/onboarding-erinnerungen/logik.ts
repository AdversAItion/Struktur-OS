// Reine Logik der Onboarding-Erinnerungen — kein IO, keine Deno-APIs.
// Dadurch mit `deno test` isoliert prüfbar (siehe logik_test.ts).

export interface Vorlage {
  trigger_typ: string
  betreff: string
  inhalt: string
  tutorial_url: string | null
  aktiv: boolean
}

export interface Empfaenger {
  name: string | null
  email: string | null
}

export interface Mail {
  to: string
  subject: string
  html: string
  text: string
}

/**
 * Sendebereit ist eine Vorlage nur, wenn sie aktiv ist UND einen Tutorial-Link
 * hat. So löst ein ENTWURF-Platzhalter (aktiv=false, url=null) nie einen
 * Versand aus — die zentrale Schutzregel gegen Platzhalter-Mails.
 */
export function istSendbereit(vorlage: Vorlage | undefined | null): vorlage is Vorlage {
  return !!vorlage && vorlage.aktiv && !!vorlage.tutorial_url && vorlage.tutorial_url.trim() !== ''
}

/** Vorname für die Anrede: erstes Wort des Namens, sonst ein neutrales Fallback. */
export function anrede(name: string | null): string {
  const ersterTeil = (name ?? '').trim().split(/\s+/)[0]
  return ersterTeil || 'zusammen'
}

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPE[c])
}

/**
 * Baut die Mail aus Vorlage + Empfänger. Ersetzt `{{name}}` durch die Anrede,
 * wandelt Zeilenumbrüche in <br> und hängt den Tutorial-Button an.
 *
 * Wirft, wenn Empfänger keine E-Mail hat oder die Vorlage nicht sendbereit ist —
 * der Aufrufer filtert solche Fälle vorher raus, das ist die zweite Absicherung.
 */
export function baueMail(vorlage: Vorlage, empfaenger: Empfaenger): Mail {
  if (!empfaenger.email) throw new Error('Empfänger ohne E-Mail')
  if (!istSendbereit(vorlage)) throw new Error('Vorlage nicht sendbereit')

  const name = anrede(empfaenger.name)
  const textRoh = vorlage.inhalt.replaceAll('{{name}}', name)
  const url = vorlage.tutorial_url!

  const text = `${textRoh}\n\nZum Tutorial: ${url}`

  const absatz = escapeHtml(textRoh).replaceAll('\n', '<br>')
  const html = `<!doctype html>
<html lang="de"><body style="margin:0;background:#0b0b0c;color:#f3f0e7;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <p style="font-size:15px;line-height:1.6;color:#f3f0e7;">${absatz}</p>
    <p style="margin-top:28px;">
      <a href="${escapeHtml(url)}"
         style="display:inline-block;background:#d4af37;color:#0b0b0c;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;">
        Zum Tutorial
      </a>
    </p>
    <p style="margin-top:32px;font-size:12px;color:#98948a;">Struktur OS</p>
  </div>
</body></html>`

  return { to: empfaenger.email, subject: vorlage.betreff, html, text }
}
