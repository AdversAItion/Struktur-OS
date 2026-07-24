import { createContext, use } from 'react'
import type { Karrierestufe, Partner, Rolle } from './types'

export interface AuthKontext {
  partner: Partner | null
  laedt: boolean
  angemeldet: boolean
  /** Nur UI-Gating. Die verbindliche Sperre sind die RLS-Policies. */
  darf: (min_role: Rolle) => boolean
  /** UI-Gating nach Karrierestufe (1–6). Verbindlich sperrt die RLS. */
  darfStufe: (min_stufe: Karrierestufe) => boolean
  abmelden: () => Promise<void>
  neuLaden: () => Promise<void>
}

export const Kontext = createContext<AuthKontext | null>(null)

export function useAuth(): AuthKontext {
  const kontext = use(Kontext)
  if (!kontext) throw new Error('useAuth braucht einen AuthProvider darüber.')
  return kontext
}
