/**
 * Reine Monats-Helfer, ohne Supabase-Bezug — für sich testbar.
 *
 * Ein „Monat" ist hier durchgängig der String `YYYY-MM`. Für die DB-Spalte
 * `ziele.monat` (date, auf den Monatsersten normiert) liefert `monatZuIso`
 * das passende `YYYY-MM-01`.
 */

/** Aktueller Monat als `YYYY-MM` (lokale Zeit). */
export function aktuellerMonat(): string {
  const jetzt = new Date()
  return `${jetzt.getFullYear()}-${zweistellig(jetzt.getMonth() + 1)}`
}

/** `YYYY-MM` → `YYYY-MM-01` für die `monat`-Spalte (Monatserster). */
export function monatZuIso(monat: string): string {
  return `${monat}-01`
}

/** Verschiebt `YYYY-MM` um `delta` Monate (−1 = Vormonat, +1 = Folgemonat). */
export function monatVerschieben(monat: string, delta: number): string {
  const [jahr, mon] = monat.split('-').map(Number)
  // Date rechnet den Monatsüberlauf (z. B. Monat 13 → nächstes Jahr) selbst.
  const d = new Date(jahr, mon - 1 + delta, 1)
  return `${d.getFullYear()}-${zweistellig(d.getMonth() + 1)}`
}

/** Halboffener Datumsbereich [von, bis) des Monats für einheiten.datum-Filter. */
export function monatsBereich(monat: string): { von: string; bis: string } {
  return { von: monatZuIso(monat), bis: monatZuIso(monatVerschieben(monat, 1)) }
}

/** Anzeige-Label, z. B. „Juli 2026". */
export function monatLabel(monat: string): string {
  const [jahr, mon] = monat.split('-').map(Number)
  return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(
    new Date(jahr, mon - 1, 1),
  )
}

function zweistellig(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}
