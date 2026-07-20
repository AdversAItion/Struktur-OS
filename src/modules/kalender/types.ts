export type TerminTyp =
  | 'rec'
  | 'vg'
  | 'ttv'
  | 'tv'
  | 'zvg'
  | 'einarbeitung'
  | 'meeting'
  | 'grundkurs'
export type TerminStatus = 'geplant' | 'stattgefunden' | 'abgesagt' | 'verschoben'
export type TodoQuelle = 'selbst' | 'vorgesetzter' | 'system'

/** Werte exakt aus dem CHECK-Constraint der `termine`-Tabelle (0007). */
export const TERMIN_TYPEN: TerminTyp[] = [
  'rec',
  'vg',
  'ttv',
  'tv',
  'zvg',
  'einarbeitung',
  'meeting',
  'grundkurs',
]
export const TERMIN_STATUS_WERTE: TerminStatus[] = [
  'geplant',
  'stattgefunden',
  'abgesagt',
  'verschoben',
]

// Klartext-Labels — hier ohne Migration anpassbar. Abkürzung + Langform.
export const TERMIN_TYP_LABEL: Record<TerminTyp, string> = {
  rec: 'REC — Rekrutierungsgespräch',
  vg: 'VG — Verkaufsgespräch',
  ttv: 'TTV — Telefonische Terminvereinbarung',
  tv: 'TV — Termin',
  zvg: 'ZVG — Zielvereinbarungsgespräch',
  einarbeitung: 'Einarbeitung',
  meeting: 'Meeting',
  grundkurs: 'Grundkurs',
}

export const TERMIN_STATUS_LABEL: Record<TerminStatus, string> = {
  geplant: 'Geplant',
  stattgefunden: 'Stattgefunden',
  abgesagt: 'Abgesagt',
  verschoben: 'Verschoben',
}

export const TODO_QUELLE_LABEL: Record<TodoQuelle, string> = {
  selbst: 'Selbst',
  vorgesetzter: 'Vorgesetzter',
  system: 'System',
}

export interface Termin {
  id: string
  partner_id: string
  /** ISO-Timestamp (timestamptz). */
  datum: string
  typ: TerminTyp
  status: TerminStatus
  created_at: string
}

/** Eingabe für einen neuen Termin — Status startet immer bei `geplant`. */
export interface TerminEingabe {
  datum: string
  typ: TerminTyp
}

export interface Todo {
  id: string
  partner_id: string
  titel: string
  /** Datum `YYYY-MM-DD`, optional. */
  faellig_am: string | null
  erledigt: boolean
  quelle: TodoQuelle
  erstellt_von: string | null
  created_at: string
}

/** Eingabe für ein neues To-do — `quelle` setzt die API auf `selbst` (Session 5: nur eigene To-dos). */
export interface TodoEingabe {
  titel: string
  faellig_am: string | null
}
