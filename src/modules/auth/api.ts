import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Partner } from './types'

/**
 * Gesamte Auth-Logik des Moduls. Komponenten rufen nur diese Funktionen auf —
 * kein direkter supabase-Zugriff in der UI (siehe CLAUDE.md, Merge-Regel 3).
 */

export async function anmelden(email: string, passwort: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: passwort,
  })
  if (error) throw new Error(uebersetzeAuthFehler(error.message))
}

// Bewusst keine registrieren()-Funktion: Accounts entstehen ausschliesslich
// durch Einladung des Masters (Supabase Auth > Invite User). Der Trigger
// on_auth_user_created legt daraus die partner-Zeile mit Rolle gp_frisch an.
// In Supabase muss zusätzlich "Allow new users to sign up" aus sein, sonst
// bliebe der Endpunkt trotz fehlender UI offen.

export async function abmelden(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function sessionLaden(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)
  return data.session
}

export function aufSessionWechselHoeren(
  callback: (session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => data.subscription.unsubscribe()
}

/** Lädt die partner-Zeile des angemeldeten Users. RLS filtert auf die eigene Zeile. */
export async function eigenenPartnerLaden(): Promise<Partner | null> {
  const { data, error } = await supabase
    .from('partner')
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as Partner | null
}

function uebersetzeAuthFehler(nachricht: string): string {
  if (nachricht.includes('Invalid login credentials')) {
    return 'E-Mail oder Passwort stimmt nicht.'
  }
  if (nachricht.includes('Email not confirmed')) {
    return 'E-Mail ist noch nicht bestätigt. Schau in dein Postfach.'
  }
  return nachricht
}
