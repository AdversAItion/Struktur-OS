import { assert, assertEquals } from 'jsr:@std/assert@1'
import { alleSignale, monatsAnteil, signaleBilden, type PartnerKennzahlen } from './logik.ts'

function basis(over: Partial<PartnerKennzahlen> = {}): PartnerKennzahlen {
  return {
    partner_id: 'p1',
    name: 'Danny',
    rolle: 'gp_stufe2',
    zielEinheiten: 400,
    istEinheiten: 100,
    zielTermine: 20,
    istTermine: 5,
    lektionenAbgeschlossen: 3,
    lektionenVerfuegbar: 3,
    ...over,
  }
}

Deno.test('einheiten_null: 0 bei Ziel -> hoch, mit korrektem Fakt', () => {
  const s = signaleBilden(basis({ istEinheiten: 0, zielEinheiten: 400 }), 0.5)
  const e = s.find((x) => x.typ === 'einheiten_null')
  assert(e)
  assertEquals(e!.prioritaet, 'hoch')
  assert(e!.fakt.includes('0 Einheiten bei Ziel 400'))
  assert(e!.empfehlung.includes('Danny'))
})

Deno.test('einheiten_null: früh im Monat schlägt NICHT an', () => {
  const s = signaleBilden(basis({ istEinheiten: 0 }), 0.2)
  assertEquals(s.some((x) => x.typ === 'einheiten_null'), false)
})

Deno.test('hinter_plan: deutlich unter Monatsanteil -> mittel', () => {
  // 100/400 = 25% Ist-Anteil, Monat zu 70% -> hinter Plan
  const s = signaleBilden(basis({ istEinheiten: 100, zielEinheiten: 400 }), 0.7)
  const e = s.find((x) => x.typ === 'hinter_plan')
  assert(e)
  assertEquals(e!.prioritaet, 'mittel')
  assert(e!.fakt.includes('25%'))
})

Deno.test('hinter_plan: im Plan -> kein Signal', () => {
  // 300/400 = 75%, Monat zu 70% -> im Plan
  const s = signaleBilden(basis({ istEinheiten: 300 }), 0.7)
  assertEquals(s.some((x) => x.typ === 'hinter_plan'), false)
})

Deno.test('einheiten_null und hinter_plan schliessen sich aus', () => {
  const s = signaleBilden(basis({ istEinheiten: 0 }), 0.7)
  assertEquals(s.filter((x) => x.typ === 'einheiten_null' || x.typ === 'hinter_plan').length, 1)
})

Deno.test('keine_termine: Ziel gesetzt, 0 Termine -> mittel', () => {
  const s = signaleBilden(basis({ zielTermine: 20, istTermine: 0 }), 0.5)
  assert(s.some((x) => x.typ === 'keine_termine' && x.prioritaet === 'mittel'))
})

Deno.test('onboarding_stockt: frischer GP, 0 Lektionen -> hoch', () => {
  const s = signaleBilden(
    basis({ rolle: 'gp_frisch', lektionenAbgeschlossen: 0, lektionenVerfuegbar: 5 }),
    0.5,
  )
  const e = s.find((x) => x.typ === 'onboarding_stockt')
  assert(e)
  assertEquals(e!.prioritaet, 'hoch')
  assert(e!.fakt.includes('0 von 5'))
})

Deno.test('onboarding_stockt: nur für gp_frisch', () => {
  const s = signaleBilden(basis({ rolle: 'gp_stufe2', lektionenAbgeschlossen: 0, lektionenVerfuegbar: 5 }), 0.5)
  assertEquals(s.some((x) => x.typ === 'onboarding_stockt'), false)
})

Deno.test('kein Ziel -> keine Einheiten-Signale (keine erfundenen Zahlen)', () => {
  const s = signaleBilden(basis({ zielEinheiten: null, istEinheiten: 0, zielTermine: null }), 0.9)
  assertEquals(s.some((x) => x.typ === 'einheiten_null' || x.typ === 'hinter_plan'), false)
})

Deno.test('alleSignale: sortiert hoch vor mittel', () => {
  const partner: PartnerKennzahlen[] = [
    basis({ partner_id: 'a', name: 'A', istEinheiten: 100, zielTermine: 20, istTermine: 0 }), // mittel (hinter_plan/keine_termine)
    basis({ partner_id: 'b', name: 'B', istEinheiten: 0 }), // hoch (einheiten_null)
  ]
  const s = alleSignale(partner, 0.7)
  assertEquals(s[0].prioritaet, 'hoch')
})

Deno.test('monatsAnteil: Monatsmitte ~0.5', () => {
  const anteil = monatsAnteil(new Date(2026, 6, 15)) // 15. Juli (31 Tage)
  assert(anteil > 0.45 && anteil < 0.52)
})
