/** Dezimalzahl in deutscher Schreibweise, ohne unnötige Nachkommastellen: 8,5 · 12 · 1,25. */
export function dezimal(n: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(n)
}

/** Datum `YYYY-MM-DD` → „18.07.2026". */
export function datumKurz(iso: string): string {
  const [jahr, monat, tag] = iso.split('-')
  return `${tag}.${monat}.${jahr}`
}
