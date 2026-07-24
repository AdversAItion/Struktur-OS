export type Rolle = 'gp_frisch' | 'gp_stufe2' | 'fuehrungskraft' | 'master'

/**
 * Rang der Rolle: höher = mehr Rechte.
 * Muss mit public.rolle_rang() in supabase/migrations/0001_init_auth_rollen.sql
 * identisch bleiben — die Datenbank ist die Autorität, das hier ist nur UI-Gating.
 */
export const ROLLEN_RANG: Record<Rolle, number> = {
  master: 40,
  fuehrungskraft: 30,
  gp_stufe2: 20,
  gp_frisch: 10,
}

export const ROLLEN_LABEL: Record<Rolle, string> = {
  master: 'Master',
  fuehrungskraft: 'Führungskraft',
  gp_stufe2: 'GP Stufe 2',
  gp_frisch: 'GP frisch',
}

/**
 * Karrierestufe im Ergo-Pro-System. Unabhängig von `Rolle`: die Rolle steuert
 * die Rechte in dieser App, die Stufe bildet die Vertriebs-Karriere ab.
 * Spiegelbild des CHECK (stufe between 1 and 6) in 0001_init_auth_rollen.sql.
 */
export type Karrierestufe = 1 | 2 | 3 | 4 | 5 | 6

export const KARRIERESTUFE_LABEL: Record<Karrierestufe, string> = {
  1: 'Repräsentant',
  2: 'Leitender Repräsentant',
  3: 'Hauptrepräsentant',
  4: 'Chefrepräsentant',
  5: 'Direktionsrepräsentant der Stufe 5',
  6: 'Direktionsrepräsentant der Stufe 6',
}

export interface Partner {
  id: string
  user_id: string
  name: string
  email: string | null
  rolle: Rolle
  stufe: Karrierestufe
  /** An wen der Partner berichtet. `null` = Wurzel der Struktur. */
  upline_id: string | null
  aktiv: boolean
  /** Start im Vertrieb (Datum), nicht das Anlegen des Accounts. */
  aktiv_seit: string
  /** Wochenziel Termine (Default 5). Setzt nur der master (RLS 0008). */
  wochenziel_termine: number
  created_at: string
}

/** Reicht die Rolle des Partners für die geforderte Mindestrolle? */
export function hatMindestensRolle(rolle: Rolle, min_role: Rolle): boolean {
  return ROLLEN_RANG[rolle] >= ROLLEN_RANG[min_role]
}

/**
 * Reicht die Karrierestufe des Partners für die geforderte Mindeststufe?
 * Grundlage fürs Stufe-Gating von Funktionen (z. B. Admin-Rechte ab Stufe 3).
 * Wie beim Rollen-Gating: reines UI-Gating — die verbindliche Sperre ist die RLS
 * (`public.meine_stufe()`).
 */
export function hatMindestensStufe(stufe: Karrierestufe, min_stufe: Karrierestufe): boolean {
  return stufe >= min_stufe
}
