import { supabase } from '@/lib/supabase'
import type {
  AkademieFortschritt,
  AkademieLektion,
  AkademieModul,
  AkademieTest,
  LektionMitFortschritt,
  ModulMitFortschritt,
} from './types'

/**
 * Gesamte Akademie-Logik des Moduls. Komponenten rufen nur diese Funktionen
 * auf — kein direkter supabase-Zugriff in der UI (siehe CLAUDE.md, Merge-Regel 3).
 *
 * Freischaltung nach Rolle (min_role) läuft komplett über RLS: `akademie_module`
 * liefert für einen Partner nur, was seine Rolle sehen darf (0003_akademie.sql).
 * Ein `null`-Ergebnis bei einer Einzelabfrage heisst deshalb entweder "existiert
 * nicht" oder "nicht freigeschaltet" — beides wird hier absichtlich nicht
 * unterschieden, damit ein gesperrtes Modul nicht mehr über sich verrät als
 * "nicht gefunden".
 */

export async function moduleMitFortschrittLaden(
  partnerId: string,
): Promise<ModulMitFortschritt[]> {
  const { data: module, error: modulFehler } = await supabase
    .from('akademie_module')
    .select('*')
    .order('kategorie')
    .order('reihenfolge')
  if (modulFehler) throw new Error(modulFehler.message)

  const modulListe = (module ?? []) as AkademieModul[]
  if (modulListe.length === 0) return []

  const modulIds = modulListe.map((m) => m.id)
  const { data: lektionen, error: lektionenFehler } = await supabase
    .from('akademie_lektionen')
    .select('id, modul_id')
    .in('modul_id', modulIds)
  if (lektionenFehler) throw new Error(lektionenFehler.message)

  const lektionListe = (lektionen ?? []) as { id: string; modul_id: string }[]
  const abgeschlosseneIds = await abgeschlosseneLektionIds(
    partnerId,
    lektionListe.map((l) => l.id),
  )

  return modulListe.map((modul) => {
    const eigene = lektionListe.filter((l) => l.modul_id === modul.id)
    return {
      ...modul,
      lektionenGesamt: eigene.length,
      lektionenAbgeschlossen: eigene.filter((l) => abgeschlosseneIds.has(l.id)).length,
    }
  })
}

export async function modulLaden(modulId: string): Promise<AkademieModul | null> {
  const { data, error } = await supabase
    .from('akademie_module')
    .select('*')
    .eq('id', modulId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as AkademieModul | null
}

export async function lektionenMitFortschrittLaden(
  modulId: string,
  partnerId: string,
): Promise<LektionMitFortschritt[]> {
  const { data: lektionen, error } = await supabase
    .from('akademie_lektionen')
    .select('*')
    .eq('modul_id', modulId)
    .order('reihenfolge')
  if (error) throw new Error(error.message)

  const liste = (lektionen ?? []) as AkademieLektion[]
  if (liste.length === 0) return []

  const abgeschlossen = await abgeschlosseneLektionIds(
    partnerId,
    liste.map((l) => l.id),
  )
  return liste.map((l) => ({ ...l, abgeschlossen: abgeschlossen.has(l.id) }))
}

export async function lektionLaden(lektionId: string): Promise<AkademieLektion | null> {
  const { data, error } = await supabase
    .from('akademie_lektionen')
    .select('*')
    .eq('id', lektionId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as AkademieLektion | null
}

export async function testsLaden(lektionId: string): Promise<AkademieTest[]> {
  const { data, error } = await supabase
    .from('akademie_tests')
    .select('*')
    .eq('lektion_id', lektionId)
  if (error) throw new Error(error.message)
  return (data ?? []) as AkademieTest[]
}

export async function eigenenFortschrittLaden(
  lektionId: string,
  partnerId: string,
): Promise<AkademieFortschritt | null> {
  const { data, error } = await supabase
    .from('akademie_fortschritt')
    .select('*')
    .eq('lektion_id', lektionId)
    .eq('partner_id', partnerId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as AkademieFortschritt | null
}

/** Markiert eine Lektion als abgeschlossen. Upsert, da eine Zeile pro Partner+Lektion existiert. */
export async function lektionAbschliessen(
  lektionId: string,
  partnerId: string,
  testBestanden: boolean,
): Promise<void> {
  const { error } = await supabase.from('akademie_fortschritt').upsert(
    {
      partner_id: partnerId,
      lektion_id: lektionId,
      abgeschlossen_am: new Date().toISOString(),
      test_bestanden: testBestanden,
    },
    { onConflict: 'partner_id,lektion_id' },
  )
  if (error) throw new Error(error.message)
}

async function abgeschlosseneLektionIds(
  partnerId: string,
  lektionIds: string[],
): Promise<Set<string>> {
  if (lektionIds.length === 0) return new Set()
  const { data, error } = await supabase
    .from('akademie_fortschritt')
    .select('lektion_id')
    .eq('partner_id', partnerId)
    .not('abgeschlossen_am', 'is', null)
    .in('lektion_id', lektionIds)
  if (error) throw new Error(error.message)
  return new Set((data ?? []).map((f) => f.lektion_id as string))
}
