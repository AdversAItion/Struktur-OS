import { createContext, use } from 'react'
import type { Partner, Rolle } from './types'

export interface AuthKontext {
  partner: Partner | null
  laedt: boolean
  angemeldet: boolean
  /** Nur UI-Gating. Die verbindliche Sperre sind die RLS-Policies. */
  darf: (min_role: Rolle) => boolean
  abmelden: () => Promise<void>
  neuLaden: () => Promise<void>
}

export const Kontext = createContext<AuthKontext | null>(null)

export function useAuth(): AuthKontext {
  const kontext = use(Kontext)
  if (!kontext) throw new Error('useAuth braucht einen AuthProvider darüber.')
  return kontext
}
