import { supabase } from '@/lib/supabase'
import type { Karrierestufe, Partner } from '@/modules/auth/types'

/**
 * Struktur-Verwaltung ab Stufe 3 (Audit). Komponenten rufen nur diese Funktionen
 * auf — kein direkter supabase-Zugriff in der UI (CLAUDE.md, Merge-Regel 3).
 *
 * Sichtbarkeit und Schreibrechte liegen komplett in der RLS (0010):
 *   * Ein Stufe-3+-Partner SELECTet seine rekursive Downline und darf dort
 *     `stufe` (bis zur eigenen Stufe) und `aktiv` setzen.
 *   * Der master sieht/ändert alles (bestehende _master-Policies).
 * Das UI spiegelt das nur — verbindlich sperrt die Datenbank.
 */

/**
 * Alle Partner, die mir die RLS zeigt, außer mir selbst — meine Downline.
 * (Für den master ist das die ganze Firma; die Seite ist primär für die
 * Stufe-3-Leiter gedacht.) Nach Namen sortiert.
 */
export async function meineStrukturLaden(eigeneId: string): Promise<Partner[]> {
  const { data, error } = await supabase.from('partner').select('*').order('name')
  if (error) throw new Error(error.message)
  return ((data ?? []) as Partner[]).filter((p) => p.id !== eigeneId)
}

/** Karrierestufe eines Downline-Partners setzen (RLS deckelt auf eigene Stufe). */
export async function stufeSetzen(partnerId: string, stufe: Karrierestufe): Promise<void> {
  const { error } = await supabase.from('partner').update({ stufe }).eq('id', partnerId)
  if (error) throw new Error(error.message)
}

/** Partner aktiv/inaktiv schalten ("rausnehmen" bzw. wieder reinnehmen). */
export async function aktivSetzen(partnerId: string, aktiv: boolean): Promise<void> {
  const { error } = await supabase.from('partner').update({ aktiv }).eq('id', partnerId)
  if (error) throw new Error(error.message)
}
