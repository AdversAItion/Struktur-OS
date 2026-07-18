import type { Partner } from '@/modules/auth/types'

export interface Ziel {
  id: string
  partner_id: string
  monat: string
  ziel_einheiten: number
  ziel_termine: number
  ziel_neuanmeldungen: number
  notiz: string | null
  erstellt_von: string | null
  created_at: string
}

export interface Einheit {
  id: string
  partner_id: string
  datum: string
  anzahl: number
  quelle: string
  erfasst_von: string | null
  created_at: string
}

/** Eingaben für das Ziel-Formular; id/monat/partner setzt die API. */
export interface ZielEingabe {
  ziel_einheiten: number
  ziel_termine: number
  ziel_neuanmeldungen: number
  notiz: string | null
}

/**
 * Eine Zeile der Monatsübersicht: ein Partner mit seinen echten Ist-Zahlen
 * gegen sein Soll. Neuanmeldungen haben (noch) keine Ist-Quelle und tauchen
 * hier bewusst nicht als Ist auf — nur Einheiten, Termine und Akademie sind
 * gemessen.
 */
export interface PartnerUebersicht {
  partner: Partner
  zielEinheiten: number | null
  istEinheiten: number
  /** Anzahl `termine`-Zeilen im Monat (alle Status) — Session 5. */
  zielTermine: number | null
  istTermine: number
  lektionenAbgeschlossen: number
  lektionenVerfuegbar: number
}

export type Prioritaet = 'hoch' | 'mittel' | 'niedrig'

/** Eine system-generierte Handlungsempfehlung (Session 8, Tabelle `insights`). */
export interface Insight {
  id: string
  partner_id: string
  monat: string
  typ: string
  prioritaet: Prioritaet
  fakt: string
  empfehlung: string
  erledigt: boolean
  erstellt_am: string
}
