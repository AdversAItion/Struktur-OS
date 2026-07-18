import { supabase } from '@/lib/supabase'
import { ROLLEN_RANG, type Partner, type Rolle } from '@/modules/auth/types'
import { monatsBereich, monatZuIso } from './monat'
import type { Einheit, PartnerUebersicht, Ziel, ZielEingabe } from './types'

/**
 * Gesamte Dashboard-Logik. Komponenten rufen nur diese Funktionen auf — kein
 * direkter supabase-Zugriff in der UI (CLAUDE.md, Merge-Regel 3).
 *
 * Sichtbarkeit läuft komplett über RLS (0002): partner/ziele/einheiten liefern
 * für master alles, für eine Führungskraft ihre Downline, sonst nur die eigene
 * Zeile. Schreiben (Einheiten, Ziele) erlaubt die RLS nur dem master — das UI
 * spiegelt das, verlässt sich aber nicht darauf.
 *
 * Achtung Numerik: numeric-Spalten (ziel_einheiten, anzahl) kommen als String
 * aus PostgREST — deshalb überall Number(...).
 */

/** Übersicht aller sichtbaren Partner für einen Monat: Ist gegen Soll + Akademie. */
export async function monatsUebersichtLaden(monat: string): Promise<PartnerUebersicht[]> {
  const { data: partnerRows, error: pErr } = await supabase.from('partner').select('*')
  if (pErr) throw new Error(pErr.message)
  const partner = (partnerRows ?? []) as Partner[]
  if (partner.length === 0) return []

  const partnerIds = partner.map((p) => p.id)
  const { von, bis } = monatsBereich(monat)

  const [zielMap, istMap, akademie] = await Promise.all([
    zieleEinheitenMap(partnerIds, monat),
    einheitenSummeMap(partnerIds, von, bis),
    akademieFortschrittMap(partner),
  ])

  return partner
    .map((p) => ({
      partner: p,
      zielEinheiten: zielMap.get(p.id) ?? null,
      istEinheiten: istMap.get(p.id) ?? 0,
      lektionenAbgeschlossen: akademie.abgeschlossen.get(p.id) ?? 0,
      lektionenVerfuegbar: akademie.verfuegbar.get(p.id) ?? 0,
    }))
    .sort((a, b) => a.partner.name.localeCompare(b.partner.name, 'de'))
}

export async function partnerLaden(id: string): Promise<Partner | null> {
  const { data, error } = await supabase.from('partner').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data as Partner | null
}

export async function zielLaden(partnerId: string, monat: string): Promise<Ziel | null> {
  const { data, error } = await supabase
    .from('ziele')
    .select('*')
    .eq('partner_id', partnerId)
    .eq('monat', monatZuIso(monat))
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? normalisiereZiel(data) : null
}

/** Legt das Monatsziel an oder aktualisiert es (Upsert auf partner_id + monat). */
export async function zielSpeichern(
  partnerId: string,
  monat: string,
  eingabe: ZielEingabe,
  erstelltVon: string,
): Promise<void> {
  const { error } = await supabase.from('ziele').upsert(
    {
      partner_id: partnerId,
      monat: monatZuIso(monat),
      ziel_einheiten: eingabe.ziel_einheiten,
      ziel_termine: eingabe.ziel_termine,
      ziel_neuanmeldungen: eingabe.ziel_neuanmeldungen,
      notiz: eingabe.notiz,
      erstellt_von: erstelltVon,
    },
    { onConflict: 'partner_id,monat' },
  )
  if (error) throw new Error(error.message)
}

export async function einheitenLaden(partnerId: string, monat: string): Promise<Einheit[]> {
  const { von, bis } = monatsBereich(monat)
  const { data, error } = await supabase
    .from('einheiten')
    .select('*')
    .eq('partner_id', partnerId)
    .gte('datum', von)
    .lt('datum', bis)
    .order('datum', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(normalisiereEinheit)
}

export async function einheitErfassen(
  partnerId: string,
  datum: string,
  anzahl: number,
  erfasstVon: string,
): Promise<void> {
  const { error } = await supabase.from('einheiten').insert({
    partner_id: partnerId,
    datum,
    anzahl,
    quelle: 'manuell',
    erfasst_von: erfasstVon,
  })
  if (error) throw new Error(error.message)
}

export async function einheitLoeschen(id: string): Promise<void> {
  const { error } = await supabase.from('einheiten').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// --- Helfer ----------------------------------------------------------------

async function zieleEinheitenMap(
  partnerIds: string[],
  monat: string,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('ziele')
    .select('partner_id, ziel_einheiten')
    .in('partner_id', partnerIds)
    .eq('monat', monatZuIso(monat))
  if (error) throw new Error(error.message)
  const map = new Map<string, number>()
  for (const z of data ?? []) map.set(z.partner_id as string, Number(z.ziel_einheiten))
  return map
}

async function einheitenSummeMap(
  partnerIds: string[],
  von: string,
  bis: string,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('einheiten')
    .select('partner_id, anzahl')
    .in('partner_id', partnerIds)
    .gte('datum', von)
    .lt('datum', bis)
  if (error) throw new Error(error.message)
  const map = new Map<string, number>()
  for (const e of data ?? []) {
    map.set(e.partner_id as string, (map.get(e.partner_id as string) ?? 0) + Number(e.anzahl))
  }
  return map
}

/**
 * Akademie-Fortschritt pro Partner: wie viele Lektionen abgeschlossen und wie
 * viele für seine Rolle überhaupt verfügbar sind (Modul-`min_role`). Wird aus
 * Modulen + Lektionen + Fortschritt clientseitig berechnet — alles Daten, die
 * der Betrachter per RLS ohnehin sehen darf.
 */
async function akademieFortschrittMap(
  partner: Partner[],
): Promise<{ verfuegbar: Map<string, number>; abgeschlossen: Map<string, number> }> {
  const [module, lektionen, fortschritt] = await Promise.all([
    supabase.from('akademie_module').select('id, min_role'),
    supabase.from('akademie_lektionen').select('id, modul_id'),
    supabase.from('akademie_fortschritt').select('partner_id').not('abgeschlossen_am', 'is', null),
  ])
  if (module.error) throw new Error(module.error.message)
  if (lektionen.error) throw new Error(lektionen.error.message)
  if (fortschritt.error) throw new Error(fortschritt.error.message)

  const modulMinRang = new Map<string, number>()
  for (const m of module.data ?? []) {
    modulMinRang.set(m.id as string, ROLLEN_RANG[m.min_role as Rolle])
  }

  // Verfügbar: Lektionen, deren Modul die Rolle des Partners freischaltet.
  const verfuegbar = new Map<string, number>()
  for (const p of partner) {
    const rang = ROLLEN_RANG[p.rolle]
    let anzahl = 0
    for (const l of lektionen.data ?? []) {
      const minRang = modulMinRang.get(l.modul_id as string)
      if (minRang !== undefined && rang >= minRang) anzahl++
    }
    verfuegbar.set(p.id, anzahl)
  }

  const abgeschlossen = new Map<string, number>()
  for (const f of fortschritt.data ?? []) {
    const id = f.partner_id as string
    abgeschlossen.set(id, (abgeschlossen.get(id) ?? 0) + 1)
  }

  return { verfuegbar, abgeschlossen }
}

function normalisiereZiel(z: Record<string, unknown>): Ziel {
  return {
    id: z.id as string,
    partner_id: z.partner_id as string,
    monat: z.monat as string,
    ziel_einheiten: Number(z.ziel_einheiten),
    ziel_termine: Number(z.ziel_termine),
    ziel_neuanmeldungen: Number(z.ziel_neuanmeldungen),
    notiz: (z.notiz as string | null) ?? null,
    erstellt_von: (z.erstellt_von as string | null) ?? null,
    created_at: z.created_at as string,
  }
}

function normalisiereEinheit(e: Record<string, unknown>): Einheit {
  return {
    id: e.id as string,
    partner_id: e.partner_id as string,
    datum: e.datum as string,
    anzahl: Number(e.anzahl),
    quelle: e.quelle as string,
    erfasst_von: (e.erfasst_von as string | null) ?? null,
    created_at: e.created_at as string,
  }
}
