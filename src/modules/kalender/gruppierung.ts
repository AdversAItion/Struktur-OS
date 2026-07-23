import type { Termin, Todo } from './types'

/**
 * Reine Datums-/Gruppierungs-Helfer, ohne Supabase-Bezug — für sich testbar
 * (siehe dashboard/monat.ts für dasselbe Muster).
 */

export interface TagGruppe {
  key: string
  label: string
  termine: Termin[]
}

function datumSchluessel(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Termine chronologisch aufsteigend. */
export function sortiereTermine(termine: Termin[]): Termin[] {
  return [...termine].sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
}

/** Beginn der Kalenderwoche (Montag 00:00) zu einem Datum. */
export function wochenStart(jetzt: Date = new Date()): Date {
  const d = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate())
  const wochentag = (d.getDay() + 6) % 7 // Mo=0 … So=6
  d.setDate(d.getDate() - wochentag)
  return d
}

/** Zahl der Termine in der laufenden Kalenderwoche (Mo–So) — fürs Wochenziel. */
export function termineDieseWoche(termine: Termin[], jetzt: Date = new Date()): number {
  const start = wochenStart(jetzt).getTime()
  const ende = start + 7 * 24 * 60 * 60 * 1000
  return termine.filter((t) => {
    const ts = new Date(t.datum).getTime()
    return ts >= start && ts < ende
  }).length
}

/** Nur Termine ab `jetzt`, aufsteigend sortiert — „kommende zuerst". */
export function kommendeTermine(termine: Termin[], jetzt: Date = new Date()): Termin[] {
  return sortiereTermine(termine.filter((t) => new Date(t.datum).getTime() >= jetzt.getTime()))
}

/** Nur Termine vor `jetzt`, absteigend sortiert (jüngste zuerst). */
export function vergangeneTermine(termine: Termin[], jetzt: Date = new Date()): Termin[] {
  return sortiereTermine(termine.filter((t) => new Date(t.datum).getTime() < jetzt.getTime())).reverse()
}

/** „Heute" / „Morgen" / Wochentag + Datum — Gruppen-Label für einen Kalendertag. */
export function tagLabel(iso: string, jetzt: Date = new Date()): string {
  const d = new Date(iso)
  const schluessel = datumSchluessel(d)
  if (schluessel === datumSchluessel(jetzt)) return 'Heute'
  const morgen = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + 1)
  if (schluessel === datumSchluessel(morgen)) return 'Morgen'
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(d)
}

/**
 * Gruppiert eine Terminliste nach Kalendertag. Sortiert selbst (aufsteigend) —
 * Aufrufer übergibt einfach die ungruppierte Auswahl (z. B. `kommendeTermine(...)`).
 */
export function gruppiereNachTag(termine: Termin[], jetzt: Date = new Date()): TagGruppe[] {
  const sortiert = sortiereTermine(termine)
  const gruppen: TagGruppe[] = []
  for (const t of sortiert) {
    const key = datumSchluessel(new Date(t.datum))
    const letzte = gruppen[gruppen.length - 1]
    if (letzte && letzte.key === key) {
      letzte.termine.push(t)
    } else {
      gruppen.push({ key, label: tagLabel(t.datum, jetzt), termine: [t] })
    }
  }
  return gruppen
}

// --- Todos -------------------------------------------------------------

/** `faellig_am` liegt vor heute und das To-do ist nicht erledigt. */
export function istUeberfaellig(
  todo: Pick<Todo, 'faellig_am' | 'erledigt'>,
  jetzt: Date = new Date(),
): boolean {
  if (todo.erledigt || !todo.faellig_am) return false
  return todo.faellig_am < datumSchluessel(jetzt)
}

/** Offene Todos: erst nach Fälligkeit (ohne Fälligkeit zuletzt), dann nach Anlage. */
export function sortiereOffeneTodos(todos: Todo[]): Todo[] {
  return [...todos]
    .filter((t) => !t.erledigt)
    .sort((a, b) => {
      if (a.faellig_am !== b.faellig_am) {
        if (a.faellig_am === null) return 1
        if (b.faellig_am === null) return -1
        return a.faellig_am.localeCompare(b.faellig_am)
      }
      return a.created_at.localeCompare(b.created_at)
    })
}

/** Erledigte Todos, zuletzt erledigte/angelegte zuerst. */
export function sortiereErledigteTodos(todos: Todo[]): Todo[] {
  return [...todos].filter((t) => t.erledigt).sort((a, b) => b.created_at.localeCompare(a.created_at))
}
