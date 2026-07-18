import { supabase } from '@/lib/supabase'
import type { ChatNachricht, Kategorie, Kontakt, KontaktEingabe, KontaktStatus } from './types'

/**
 * Gesamte Namenslisten-Logik. Komponenten rufen nur diese Funktionen auf —
 * kein direkter supabase-Zugriff in der UI (CLAUDE.md, Merge-Regel 3).
 *
 * Kontakte-Rechte kommen aus der RLS (0005): jeder verwaltet seine eigene Liste,
 * die Struktur (Rang >= 30) liest mit, master darf alles.
 */

export async function kontakteLaden(partnerId: string): Promise<Kontakt[]> {
  const { data, error } = await supabase
    .from('kontakte')
    .select('*')
    .eq('partner_id', partnerId)
    .order('kategorie')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Kontakt[]
}

export async function kontaktAnlegen(
  partnerId: string,
  eingabe: KontaktEingabe,
): Promise<Kontakt> {
  const { data, error } = await supabase
    .from('kontakte')
    .insert({
      partner_id: partnerId,
      name: eingabe.name,
      kategorie: eingabe.kategorie,
      beziehung: eingabe.beziehung ?? null,
      telefon: eingabe.telefon ?? null,
      notiz: eingabe.notiz ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Kontakt
}

export async function kontaktKategorieSetzen(id: string, kategorie: Kategorie): Promise<void> {
  const { error } = await supabase
    .from('kontakte')
    .update({ kategorie, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function kontaktStatusSetzen(id: string, status: KontaktStatus): Promise<void> {
  const { error } = await supabase
    .from('kontakte')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function kontaktLoeschen(id: string): Promise<void> {
  const { error } = await supabase.from('kontakte').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Schickt den Chat-Verlauf an die Edge Function und gibt die nächste Frage
 * der KI zurück. Der Verlauf muss für die Anthropic-API mit einer
 * Nutzer-Nachricht beginnen — führende Assistant-Nachrichten (z. B. der
 * lokale Begrüßungstext) werden hier vorher entfernt.
 */
export async function interviewSenden(verlauf: ChatNachricht[]): Promise<string> {
  const abFirstUser = verlauf.slice(verlauf.findIndex((n) => n.rolle === 'user'))
  if (abFirstUser.length === 0) throw new Error('Bitte zuerst etwas schreiben.')

  const { data, error } = await supabase.functions.invoke('namensliste-interview', {
    body: { verlauf: abFirstUser },
  })
  if (error) throw new Error(error.message)
  if (data?.fehler) throw new Error(data.fehler)
  const antwort = (data?.antwort ?? '').trim()
  if (!antwort) throw new Error('Keine Antwort erhalten.')
  return antwort
}
