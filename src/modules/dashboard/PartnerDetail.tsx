import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/modules/auth/kontext'
import { KARRIERESTUFE_LABEL, ROLLEN_LABEL, type Partner } from '@/modules/auth/types'
import {
  einheitErfassen,
  einheitenLaden,
  einheitLoeschen,
  partnerLaden,
  wochenzielSetzen,
  zielLaden,
  zielSpeichern,
} from './api'
import { datumKurz, dezimal } from './format'
import { aktuellerMonat, monatLabel, monatZuIso } from './monat'
import type { Einheit, Ziel } from './types'

function heuteIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const INPUT =
  'mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-text placeholder:text-muted focus:border-gold focus:outline-none'
const LABEL = 'num text-xs tracking-wider text-muted uppercase'

export function PartnerDetail() {
  const { partnerId } = useParams<{ partnerId: string }>()
  const [params] = useSearchParams()
  const monat = params.get('monat') ?? aktuellerMonat()
  const { partner: ich, darf } = useAuth()
  const istMaster = darf('master')

  const [partner, setPartner] = useState<Partner | null | undefined>(undefined)
  const [ziel, setZiel] = useState<Ziel | null>(null)
  const [einheiten, setEinheiten] = useState<Einheit[]>([])
  const [fehler, setFehler] = useState<string | null>(null)

  const laden = useCallback(() => {
    if (!partnerId) return Promise.resolve()
    setFehler(null)
    return Promise.all([
      partnerLaden(partnerId),
      zielLaden(partnerId, monat),
      einheitenLaden(partnerId, monat),
    ])
      .then(([p, z, e]) => {
        setPartner(p)
        setZiel(z)
        setEinheiten(e)
      })
      .catch((err: unknown) => setFehler(err instanceof Error ? err.message : 'Laden fehlgeschlagen.'))
  }, [partnerId, monat])

  useEffect(() => {
    void laden()
  }, [laden])

  const ist = einheiten.reduce((s, e) => s + e.anzahl, 0)

  if (partner === undefined) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="num text-sm text-muted">Lädt ...</p>
      </div>
    )
  }
  if (partner === null) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link to={`/dashboard?monat=${monat}`} className="text-sm text-muted hover:text-text">
          ← Dashboard
        </Link>
        <p className="mt-4 text-sm text-muted">Partner nicht gefunden oder nicht sichtbar.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/dashboard?monat=${monat}`} className="text-sm text-muted hover:text-text">
        ← Dashboard
      </Link>
      <h1 className="mt-3 font-display text-2xl leading-tight font-extrabold md:text-3xl">
        {partner.name || 'Ohne Namen'}
      </h1>
      <p className="num mt-1 text-xs text-muted">
        {ROLLEN_LABEL[partner.rolle]} · {KARRIERESTUFE_LABEL[partner.stufe]} · {monatLabel(monat)}
      </p>

      {fehler && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {fehler}
        </p>
      )}

      <div className="mt-5 rounded-xl border border-line bg-panel p-5">
        <div className="flex items-baseline justify-between">
          <span className="num text-xs tracking-widest text-gold uppercase">Einheiten (Ist)</span>
          <span className="num text-2xl font-bold text-text">{dezimal(ist)}</span>
        </div>
        {ziel && ziel.ziel_einheiten > 0 && (
          <p className="num mt-1 text-xs text-muted">Ziel: {dezimal(ziel.ziel_einheiten)}</p>
        )}
      </div>

      {istMaster && ich ? (
        <ZielForm partnerId={partner.id} monat={monat} ziel={ziel} erstelltVon={ich.id} onGespeichert={laden} />
      ) : (
        <ZielAnzeige ziel={ziel} />
      )}

      <WochenzielControl partner={partner} istMaster={istMaster} onGespeichert={laden} />

      <div className="mt-8">
        <p className="num text-xs tracking-widest text-gold uppercase">Erfasste Einheiten</p>
        {istMaster && ich && (
          <EinheitErfassen partnerId={partner.id} monat={monat} erfasstVon={ich.id} onErfasst={laden} />
        )}
        <div className="mt-3 flex flex-col gap-2">
          {einheiten.length === 0 && (
            <p className="text-sm text-muted">In diesem Monat noch nichts erfasst.</p>
          )}
          {einheiten.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-2.5"
            >
              <span className="num text-sm text-muted">{datumKurz(e.datum)}</span>
              <div className="flex items-center gap-3">
                <span className="num text-sm font-bold text-text">{dezimal(e.anzahl)}</span>
                {istMaster && (
                  <button
                    type="button"
                    onClick={() => void loeschenMit(e.id, laden, setFehler)}
                    className="text-xs text-muted hover:text-red-400"
                    aria-label="Einheit löschen"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

async function loeschenMit(
  id: string,
  neuLaden: () => Promise<void>,
  setFehler: (f: string) => void,
) {
  if (!confirm('Diese Einheit löschen?')) return
  try {
    await einheitLoeschen(id)
    await neuLaden()
  } catch (e) {
    setFehler(e instanceof Error ? e.message : 'Löschen fehlgeschlagen.')
  }
}

function ZielForm({
  partnerId,
  monat,
  ziel,
  erstelltVon,
  onGespeichert,
}: {
  partnerId: string
  monat: string
  ziel: Ziel | null
  erstelltVon: string
  onGespeichert: () => Promise<void>
}) {
  const [einheiten, setEinheiten] = useState(String(ziel?.ziel_einheiten ?? ''))
  const [termine, setTermine] = useState(String(ziel?.ziel_termine ?? ''))
  const [neuanmeldungen, setNeuanmeldungen] = useState(String(ziel?.ziel_neuanmeldungen ?? ''))
  const [notiz, setNotiz] = useState(ziel?.notiz ?? '')
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [gespeichert, setGespeichert] = useState(false)

  async function speichern() {
    const ze = zahl(einheiten)
    const zt = zahl(termine)
    const zn = zahl(neuanmeldungen)
    if (ze < 0 || zt < 0 || zn < 0 || Number.isNaN(ze) || Number.isNaN(zt) || Number.isNaN(zn)) {
      setFehler('Ziele müssen Zahlen ≥ 0 sein.')
      return
    }
    setSpeichert(true)
    setFehler(null)
    setGespeichert(false)
    try {
      await zielSpeichern(
        partnerId,
        monat,
        {
          ziel_einheiten: ze,
          ziel_termine: Math.round(zt),
          ziel_neuanmeldungen: Math.round(zn),
          notiz: notiz.trim() || null,
        },
        erstelltVon,
      )
      await onGespeichert()
      setGespeichert(true)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-4 rounded-xl border border-line bg-panel p-5">
      <p className="num text-xs tracking-widest text-muted uppercase">Ziele für {monatLabel(monat)}</p>
      <div className="grid grid-cols-3 gap-3">
        <Zahlfeld label="Einheiten" wert={einheiten} setzen={setEinheiten} schritt="0.5" />
        <Zahlfeld label="Termine" wert={termine} setzen={setTermine} schritt="1" />
        <Zahlfeld label="Neuanm." wert={neuanmeldungen} setzen={setNeuanmeldungen} schritt="1" />
      </div>
      <label className="block">
        <span className={LABEL}>Notiz (aus dem Gespräch)</span>
        <textarea
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
          rows={2}
          className={`${INPUT} resize-y`}
          placeholder="Was wurde vereinbart?"
        />
      </label>
      {fehler && (
        <p role="alert" className="text-sm text-red-400">
          {fehler}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void speichern()}
          disabled={speichert}
          className="rounded-lg bg-gold px-4 py-2.5 font-display text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {speichert ? 'Speichert ...' : 'Ziele speichern'}
        </button>
        {gespeichert && <span className="num text-xs text-gold">Gespeichert.</span>}
      </div>
    </div>
  )
}

function ZielAnzeige({ ziel }: { ziel: Ziel | null }) {
  if (!ziel) {
    return <p className="mt-4 text-sm text-muted">Für diesen Monat ist noch kein Ziel gesetzt.</p>
  }
  return (
    <div className="mt-4 rounded-xl border border-line bg-panel p-5">
      <p className="num text-xs tracking-widest text-muted uppercase">Ziele</p>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <Zielwert label="Einheiten" wert={dezimal(ziel.ziel_einheiten)} />
        <Zielwert label="Termine" wert={String(ziel.ziel_termine)} />
        <Zielwert label="Neuanm." wert={String(ziel.ziel_neuanmeldungen)} />
      </div>
      {ziel.notiz && <p className="mt-3 text-sm text-muted">{ziel.notiz}</p>}
    </div>
  )
}

function Zielwert({ label, wert }: { label: string; wert: string }) {
  return (
    <div>
      <p className="num text-lg font-bold text-text">{wert}</p>
      <p className="num text-[10px] tracking-wider text-muted uppercase">{label}</p>
    </div>
  )
}

/**
 * Wochenziel Termine (Session Audit). Master setzt es pro GP; Nicht-Master
 * sehen es nur. Referenzwert ist 5 — individuell anpassbar.
 */
function WochenzielControl({
  partner,
  istMaster,
  onGespeichert,
}: {
  partner: Partner
  istMaster: boolean
  onGespeichert: () => Promise<void>
}) {
  const [wert, setWert] = useState(String(partner.wochenziel_termine))
  const [speichert, setSpeichert] = useState(false)
  const [gespeichert, setGespeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function speichern() {
    const n = Math.round(zahl(wert))
    if (Number.isNaN(n) || n < 0) {
      setFehler('Bitte eine Zahl ≥ 0.')
      return
    }
    setSpeichert(true)
    setFehler(null)
    setGespeichert(false)
    try {
      await wochenzielSetzen(partner.id, n)
      await onGespeichert()
      setGespeichert(true)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-line bg-panel p-5">
      <p className="num text-xs tracking-widest text-muted uppercase">Wochenziel Termine</p>
      {istMaster ? (
        <div className="mt-2 flex items-center gap-3">
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={wert}
            onChange={(e) => setWert(e.target.value)}
            aria-label="Wochenziel Termine"
            className="w-24 rounded-lg border border-line bg-bg px-3 py-2.5 text-text focus:border-gold focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void speichern()}
            disabled={speichert}
            className="rounded-lg bg-gold px-4 py-2.5 font-display text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {speichert ? 'Speichert ...' : 'Setzen'}
          </button>
          {gespeichert && <span className="num text-xs text-gold">Gespeichert.</span>}
        </div>
      ) : (
        <p className="num mt-1 text-2xl font-bold text-text">{partner.wochenziel_termine}</p>
      )}
      {fehler && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {fehler}
        </p>
      )}
    </div>
  )
}

function EinheitErfassen({
  partnerId,
  monat,
  erfasstVon,
  onErfasst,
}: {
  partnerId: string
  monat: string
  erfasstVon: string
  onErfasst: () => Promise<void>
}) {
  const standardDatum = monat === aktuellerMonat() ? heuteIso() : monatZuIso(monat)
  const [datum, setDatum] = useState(standardDatum)
  const [anzahl, setAnzahl] = useState('')
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function erfassen() {
    const a = zahl(anzahl)
    if (Number.isNaN(a) || a <= 0) {
      setFehler('Bitte eine Anzahl > 0 eingeben.')
      return
    }
    setSpeichert(true)
    setFehler(null)
    try {
      await einheitErfassen(partnerId, datum, a, erfasstVon)
      setAnzahl('')
      setDatum(standardDatum)
      await onErfasst()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Erfassen fehlgeschlagen.')
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={LABEL}>Datum</span>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className={INPUT} />
        </label>
        <Zahlfeld label="Anzahl" wert={anzahl} setzen={setAnzahl} schritt="0.5" />
      </div>
      {fehler && (
        <p role="alert" className="text-sm text-red-400">
          {fehler}
        </p>
      )}
      <button
        type="button"
        onClick={() => void erfassen()}
        disabled={speichert}
        className="rounded-lg bg-gold px-4 py-2.5 font-display text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {speichert ? 'Erfasst ...' : 'Einheit erfassen'}
      </button>
    </div>
  )
}

function Zahlfeld({
  label,
  wert,
  setzen,
  schritt,
}: {
  label: string
  wert: string
  setzen: (w: string) => void
  schritt: string
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step={schritt}
        value={wert}
        onChange={(e) => setzen(e.target.value)}
        className={INPUT}
      />
    </label>
  )
}

/** Leerer String → 0, sonst als Zahl (Komma erlaubt). */
function zahl(s: string): number {
  const t = s.trim().replace(',', '.')
  if (t === '') return 0
  return Number(t)
}
