// Reine Regel-Engine der KI-Insights — kein IO, keine Deno-APIs, kein SDK.
// Deterministisch und mit `deno test` isoliert prüfbar. Die KI (index.ts)
// verfeinert später höchstens die Formulierung; die Signale selbst entstehen HIER
// aus echten Daten — keine erfundenen Zahlen (CLAUDE.md).

export type Prioritaet = 'hoch' | 'mittel' | 'niedrig'
export type InsightTyp = 'einheiten_null' | 'hinter_plan' | 'keine_termine' | 'onboarding_stockt'

export interface PartnerKennzahlen {
  partner_id: string
  name: string
  rolle: string
  zielEinheiten: number | null
  istEinheiten: number
  zielTermine: number | null
  istTermine: number
  lektionenAbgeschlossen: number
  lektionenVerfuegbar: number
}

export interface Signal {
  partner_id: string
  typ: InsightTyp
  prioritaet: Prioritaet
  fakt: string
  empfehlung: string
}

/** Anteil des Monats, der schon vergangen ist (0..1). Steuert, ab wann ein Rückstand zählt. */
export function monatsAnteil(heute: Date): number {
  const jahr = heute.getFullYear()
  const monat = heute.getMonth()
  const tageImMonat = new Date(jahr, monat + 1, 0).getDate()
  return heute.getDate() / tageImMonat
}

function dez(n: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(n)
}

// Schwellenwerte — bewusst „lockerer" (Entscheidung Audit): erst ab Monatsmitte
// und nur bei deutlichem Rückstand flaggen. Zentral, damit leicht justierbar.
export const MONATS_SCHWELLE = 0.5 // erst ab Monatshälfte auf 0-Werte reagieren
export const PLAN_RUECKSTAND = 0.35 // „hinter Plan" erst bei >35 % Abstand zum Monatsanteil

/**
 * Bildet die Signale für einen Partner. Gibt nur auffällige Punkte zurück
 * (leeres Array = alles im grünen Bereich). `anteil` ist der Monatsfortschritt;
 * früh im Monat schlägt ein Rückstand bewusst noch nicht an.
 */
export function signaleBilden(k: PartnerKennzahlen, anteil: number): Signal[] {
  const signale: Signal[] = []
  const hatEinheitenZiel = k.zielEinheiten !== null && k.zielEinheiten > 0

  // 1. Nichts geliefert bei gesetztem Ziel, Monat schon ein Stück weit -> eingreifen.
  if (hatEinheitenZiel && k.istEinheiten === 0 && anteil > MONATS_SCHWELLE) {
    signale.push({
      partner_id: k.partner_id,
      typ: 'einheiten_null',
      prioritaet: 'hoch',
      fakt: `0 Einheiten bei Ziel ${dez(k.zielEinheiten!)}`,
      empfehlung: `${k.name}: eingreifen — Termine sichern und Woche gemeinsam planen.`,
    })
  } else if (
    // 2. Deutlich hinter Plan (Ist-Anteil liegt spürbar unter dem Monatsanteil).
    hatEinheitenZiel &&
    k.istEinheiten > 0 &&
    k.istEinheiten / k.zielEinheiten! < anteil - PLAN_RUECKSTAND
  ) {
    const prozent = Math.round((k.istEinheiten / k.zielEinheiten!) * 100)
    signale.push({
      partner_id: k.partner_id,
      typ: 'hinter_plan',
      prioritaet: 'mittel',
      fakt: `${dez(k.istEinheiten)} von ${dez(k.zielEinheiten!)} Einheiten (${prozent}%)`,
      empfehlung: `${k.name}: hinter Plan — nachfassen, woran es hakt.`,
    })
  }

  // 3. Termin-Ziel gesetzt, aber noch kein einziger Termin.
  if (k.zielTermine !== null && k.zielTermine > 0 && k.istTermine === 0 && anteil > MONATS_SCHWELLE) {
    signale.push({
      partner_id: k.partner_id,
      typ: 'keine_termine',
      prioritaet: 'mittel',
      fakt: `0 von ${k.zielTermine} Terminen`,
      empfehlung: `${k.name}: keine Termine im Kalender — Terminierung üben.`,
    })
  }

  // 4. Frischer GP, Akademie freigeschaltet, aber 0 Lektionen -> Onboarding stockt.
  if (
    k.rolle === 'gp_frisch' &&
    k.lektionenVerfuegbar > 0 &&
    k.lektionenAbgeschlossen === 0
  ) {
    signale.push({
      partner_id: k.partner_id,
      typ: 'onboarding_stockt',
      prioritaet: 'hoch',
      fakt: `0 von ${k.lektionenVerfuegbar} Lektionen`,
      empfehlung: `${k.name}: Onboarding stockt — erste Akademie-Lektion gemeinsam starten.`,
    })
  }

  return signale
}

/** Alle Signale mehrerer Partner, nach Priorität sortiert (hoch zuerst). */
export function alleSignale(partner: PartnerKennzahlen[], anteil: number): Signal[] {
  const rang: Record<Prioritaet, number> = { hoch: 0, mittel: 1, niedrig: 2 }
  return partner
    .flatMap((p) => signaleBilden(p, anteil))
    .sort((a, b) => rang[a.prioritaet] - rang[b.prioritaet])
}
