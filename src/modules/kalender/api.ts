import { supabase } from '@/lib/supabase'
import type { Termin, TerminEingabe, TerminStatus, Todo, TodoEingabe } from './types'

/**
 * Gesamte Kalender-/To-do-Logik. Komponenten rufen nur diese Funktionen auf —
 * kein direkter supabase-Zugriff in der UI (CLAUDE.md, Merge-Regel 3).
 *
 * Rechte kommen aus der RLS (0002):
 * - termine: lesen eigene + Struktur (Rang >= 30) + master; schreiben eigene + master.
 * - todos: lesen eigene + Struktur; INSERT eigene + Struktur (Führungskraft darf der
 *   Downline To-dos geben) + master; update/delete eigene + master.
 *
 * Für Session 5 verwaltet hier jeder Partner nur seine eigenen Zeilen (partnerId ist
 * immer der angemeldete Partner) — die Struktur-Lesesicht/Fremdvergabe ist RLS-seitig
 * schon vorbereitet, aber (noch) nicht ans UI angebunden (siehe README, „Offen").
 */

export async function termineLaden(partnerId: string): Promise<Termin[]> {
  const { data, error } = await supabase
    .from('termine')
    .select('*')
    .eq('partner_id', partnerId)
    .order('datum', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Termin[]
}

/** Legt einen Termin an. Status startet immer bei `geplant` (DB-Default). */
export async function terminAnlegen(partnerId: string, eingabe: TerminEingabe): Promise<void> {
  const { error } = await supabase.from('termine').insert({
    partner_id: partnerId,
    datum: eingabe.datum,
    typ: eingabe.typ,
  })
  if (error) throw new Error(error.message)
}

export async function terminStatusAendern(id: string, status: TerminStatus): Promise<void> {
  const { error } = await supabase.from('termine').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function terminLoeschen(id: string): Promise<void> {
  const { error } = await supabase.from('termine').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function todosLaden(partnerId: string): Promise<Todo[]> {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Todo[]
}

/** Legt ein eigenes To-do an (`quelle = 'selbst'`). Fremdvergabe ist Session 5 nicht im Scope. */
export async function todoAnlegen(partnerId: string, eingabe: TodoEingabe): Promise<void> {
  const { error } = await supabase.from('todos').insert({
    partner_id: partnerId,
    titel: eingabe.titel,
    faellig_am: eingabe.faellig_am,
    quelle: 'selbst',
    erstellt_von: partnerId,
  })
  if (error) throw new Error(error.message)
}

export async function todoErledigtSetzen(id: string, erledigt: boolean): Promise<void> {
  const { error } = await supabase.from('todos').update({ erledigt }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function todoLoeschen(id: string): Promise<void> {
  const { error } = await supabase.from('todos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
