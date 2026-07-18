export type Kategorie = 'A' | 'B' | 'C'

export const KATEGORIEN: Kategorie[] = ['A', 'B', 'C']

export const KATEGORIE_LABEL: Record<Kategorie, string> = {
  A: 'A — eng',
  B: 'B — mittel',
  C: 'C — lose',
}

export type KontaktStatus = 'offen' | 'kontaktiert'

export interface Kontakt {
  id: string
  partner_id: string
  name: string
  kategorie: Kategorie
  beziehung: string | null
  telefon: string | null
  notiz: string | null
  status: KontaktStatus
  created_at: string
  updated_at: string
}

/** Eingabe fürs Anlegen; id/partner_id/status/Zeitstempel setzt die API/DB. */
export interface KontaktEingabe {
  name: string
  kategorie: Kategorie
  beziehung?: string | null
  telefon?: string | null
  notiz?: string | null
}

export type ChatRolle = 'user' | 'assistant'

export interface ChatNachricht {
  rolle: ChatRolle
  text: string
}
