// Reine Logik des Namenslisten-Interviews — kein IO, keine Deno-APIs,
// kein Anthropic-SDK. Dadurch mit `deno test` isoliert prüfbar.

export type Rolle = 'user' | 'assistant'

export interface ChatNachricht {
  rolle: Rolle
  text: string
}

/**
 * System-Prompt für den KI-Interviewer. Führt einen neuen GP Frage für Frage
 * durch die Gedächtnis-Kategorien, damit er seine Namensliste ohne Hilfe des
 * Teams aufbaut. Bewusst als Konstante (stabiler Cache-Prefix, siehe index.ts).
 *
 * Wichtig: Der Interviewer denkt sich KEINE Kontakte aus — er hilft dem GP nur,
 * sich an echte Menschen zu erinnern (CLAUDE.md: keine erfundenen Daten).
 */
export const SYSTEM_PROMPT = `Du bist der Interview-Coach von Struktur OS und hilfst einem neuen Vertriebspartner (GP), seine "Namensliste" aufzubauen — die Liste aller Menschen, die er kennt.

Deine Aufgabe: den GP Schritt für Schritt durch seine Erinnerung führen, damit ihm möglichst viele echte Kontakte einfallen.

Regeln:
- Stelle IMMER nur EINE Frage pro Nachricht. Kurz, warm, konkret.
- Arbeite dich durch Gedächtnis-Kategorien: Familie & Verwandte, enge Freunde, aktuelle und frühere Arbeitskollegen, Nachbarn, Verein/Sport/Hobby, Schule/Ausbildung/Studium, Menschen aus Dienstleistungen (Friseur, Trainer, Arzt), ehemalige Wegbegleiter.
- Wenn der GP Namen nennt, bestätige kurz und ermutige, sie über den "Kontakt hinzufügen"-Knopf einzutragen — mit einer ABC-Kategorie: A = enger/warmer Kontakt, B = mittel, C = eher lose.
- Erfinde NIEMALS selbst Namen oder Menschen. Du hilfst nur beim Erinnern.
- Wenn eine Kategorie erschöpft ist, gehe weiter zur nächsten. Halte den GP bei Laune.
- Antworte auf Deutsch, direkt, ohne Füllwörter. Keine langen Vorreden, keine Aufzählungen mehrerer Fragen — nur die nächste Frage.`

/** Erste Nachricht des Interviewers, wenn der GP noch nichts gesagt hat. */
export const START_FRAGE =
  'Lass uns deine Namensliste aufbauen. Wir gehen deine Kontakte in Ruhe durch — Kategorie für Kategorie. Fang leicht an: Wer gehört zu deiner engsten Familie?'

/**
 * Wandelt den Chat-Verlauf des Frontends in das Messages-Format der Anthropic-API.
 * Erwartet, dass die erste Nachricht vom `user` kommt (API-Regel).
 */
export function zuApiMessages(verlauf: ChatNachricht[]): { role: Rolle; content: string }[] {
  return verlauf
    .filter((n) => n.text.trim() !== '')
    .map((n) => ({ role: n.rolle, content: n.text }))
}

/** Prüft die API-Grundregeln: nicht leer und beginnt mit `user`. */
export function verlaufIstGueltig(verlauf: ChatNachricht[]): boolean {
  const gefiltert = verlauf.filter((n) => n.text.trim() !== '')
  return gefiltert.length > 0 && gefiltert[0].rolle === 'user'
}

/**
 * Zieht den reinen Text aus den Content-Blöcken einer Anthropic-Antwort.
 * `content` ist ein Union-Array; nur `type: 'text'`-Blöcke zählen.
 */
export function textAusAntwort(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text as string)
    .join('')
    .trim()
}
