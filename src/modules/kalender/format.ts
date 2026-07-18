/** Uhrzeit aus einem ISO-Timestamp, deutsch: „14:30". */
export function uhrzeit(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  )
}

/** Datum `YYYY-MM-DD` → „18.07.2026". */
export function datumKurz(iso: string): string {
  const [jahr, monat, tag] = iso.split('-')
  return `${tag}.${monat}.${jahr}`
}

/** Inputwert von `<input type="datetime-local">` (lokale Zeit) → ISO-String für die DB. */
export function localZuIso(local: string): string {
  return new Date(local).toISOString()
}

/** Jetzt als Inputwert für `<input type="datetime-local">`. */
export function jetztAlsLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
