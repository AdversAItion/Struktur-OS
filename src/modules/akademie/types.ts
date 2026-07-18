import type { Rolle } from '@/modules/auth/types'

export type AkademieKategorie =
  | 'ergo_basics'
  | 'produkte'
  | 'karriere'
  | 'verkauf'
  | 'anmeldung'
  | 'stufe2'

export const KATEGORIE_LABEL: Record<AkademieKategorie, string> = {
  ergo_basics: 'Ergo Basics',
  produkte: 'Produkte',
  karriere: 'Karriere',
  verkauf: 'Verkauf',
  anmeldung: 'Anmeldung',
  stufe2: 'Stufe 2',
}

export interface AkademieModul {
  id: string
  titel: string
  beschreibung: string | null
  min_role: Rolle
  reihenfolge: number
  kategorie: AkademieKategorie
  created_at: string
}

export interface AkademieLektion {
  id: string
  modul_id: string
  titel: string
  video_url: string | null
  inhalt_markdown: string | null
  reihenfolge: number
  created_at: string
}

export interface AkademieTest {
  id: string
  lektion_id: string
  frage: string
  antworten: string[]
  /** 0-basierter Index in `antworten`. */
  richtige_antwort: number
  created_at: string
}

export interface AkademieFortschritt {
  id: string
  partner_id: string
  lektion_id: string
  abgeschlossen_am: string | null
  test_bestanden: boolean
  created_at: string
}

export interface ModulMitFortschritt extends AkademieModul {
  lektionenGesamt: number
  lektionenAbgeschlossen: number
}

export interface LektionMitFortschritt extends AkademieLektion {
  abgeschlossen: boolean
}
