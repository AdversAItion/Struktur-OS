import { useState } from 'react'
import { terminAnlegen, terminLoeschen, terminStatusAendern } from './api'
import { jetztAlsLocal, localZuIso, uhrzeit } from './format'
import { gruppiereNachTag, kommendeTermine, vergangeneTermine } from './gruppierung'
import {
  TERMIN_STATUS_LABEL,
  TERMIN_STATUS_WERTE,
  TERMIN_TYPEN,
  TERMIN_TYP_LABEL,
  type Termin,
  type TerminTyp,
  type TerminStatus,
} from './types'

const INPUT =
  'mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-text placeholder:text-muted focus:border-gold focus:outline-none'
const LABEL = 'num text-xs tracking-wider text-muted uppercase'

export function TermineBereich({
  partnerId,
  termine,
  onGeaendert,
}: {
  partnerId: string
  termine: Termin[]
  onGeaendert: () => Promise<void>
}) {
  const [formularOffen, setFormularOffen] = useState(false)
  const [vergangeneOffen, setVergangeneOffen] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const jetzt = new Date()
  const kommendeGruppen = gruppiereNachTag(kommendeTermine(termine, jetzt), jetzt)
  const vergangene = vergangeneTermine(termine, jetzt)

  async function statusAendern(id: string, status: TerminStatus) {
    setFehler(null)
    try {
      await terminStatusAendern(id, status)
      await onGeaendert()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Ändern fehlgeschlagen.')
    }
  }

  async function loeschen(id: string) {
    if (!confirm('Diesen Termin löschen?')) return
    setFehler(null)
    try {
      await terminLoeschen(id)
      await onGeaendert()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Löschen fehlgeschlagen.')
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-text">Termine</h2>
        <button
          type="button"
          onClick={() => setFormularOffen((o) => !o)}
          className="num rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-gold transition-colors hover:border-gold"
        >
          {formularOffen ? 'Abbrechen' : '+ Termin'}
        </button>
      </div>

      {fehler && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {fehler}
        </p>
      )}

      {formularOffen && (
        <TerminFormular
          partnerId={partnerId}
          onAngelegt={async () => {
            setFormularOffen(false)
            await onGeaendert()
          }}
        />
      )}

      <div className="mt-4 flex flex-col gap-5">
        {kommendeGruppen.length === 0 && (
          <p className="text-sm text-muted">Keine anstehenden Termine.</p>
        )}
        {kommendeGruppen.map((gruppe) => (
          <div key={gruppe.key}>
            <p className="num text-xs tracking-wider text-muted uppercase">{gruppe.label}</p>
            <div className="mt-2 flex flex-col gap-2">
              {gruppe.termine.map((t) => (
                <TerminZeile key={t.id} termin={t} onStatus={statusAendern} onLoeschen={loeschen} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {vergangene.length > 0 && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setVergangeneOffen((o) => !o)}
            className="num text-xs tracking-wider text-muted uppercase hover:text-text"
          >
            {vergangeneOffen
              ? '− Vergangene ausblenden'
              : `+ Vergangene anzeigen (${vergangene.length})`}
          </button>
          {vergangeneOffen && (
            <div className="mt-2 flex flex-col gap-2">
              {vergangene.map((t) => (
                <TerminZeile
                  key={t.id}
                  termin={t}
                  onStatus={statusAendern}
                  onLoeschen={loeschen}
                  vergangen
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function TerminFormular({
  partnerId,
  onAngelegt,
}: {
  partnerId: string
  onAngelegt: () => Promise<void>
}) {
  const [datum, setDatum] = useState(jetztAlsLocal())
  const [typ, setTyp] = useState<TerminTyp>('beratung')
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function anlegen() {
    if (!datum) {
      setFehler('Bitte Datum und Uhrzeit wählen.')
      return
    }
    setSpeichert(true)
    setFehler(null)
    try {
      await terminAnlegen(partnerId, { datum: localZuIso(datum), typ })
      await onAngelegt()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Anlegen fehlgeschlagen.')
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Datum &amp; Uhrzeit</span>
          <input
            type="datetime-local"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className={INPUT}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Typ</span>
          <select
            value={typ}
            onChange={(e) => setTyp(e.target.value as TerminTyp)}
            className={INPUT}
          >
            {TERMIN_TYPEN.map((t) => (
              <option key={t} value={t}>
                {TERMIN_TYP_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {fehler && (
        <p role="alert" className="text-sm text-red-400">
          {fehler}
        </p>
      )}
      <button
        type="button"
        onClick={() => void anlegen()}
        disabled={speichert}
        className="rounded-lg bg-gold px-4 py-2.5 font-display text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {speichert ? 'Speichert ...' : 'Termin anlegen'}
      </button>
    </div>
  )
}

function TerminZeile({
  termin,
  onStatus,
  onLoeschen,
  vergangen,
}: {
  termin: Termin
  onStatus: (id: string, status: TerminStatus) => Promise<void>
  onLoeschen: (id: string) => Promise<void>
  vergangen?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-2.5 ${vergangen ? 'opacity-70' : ''}`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-text">{TERMIN_TYP_LABEL[termin.typ]}</p>
        <p className="num mt-0.5 text-xs text-muted">{uhrzeit(termin.datum)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select
          value={termin.status}
          onChange={(e) => void onStatus(termin.id, e.target.value as TerminStatus)}
          aria-label="Status ändern"
          className="num rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-text focus:border-gold focus:outline-none"
        >
          {TERMIN_STATUS_WERTE.map((s) => (
            <option key={s} value={s}>
              {TERMIN_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void onLoeschen(termin.id)}
          aria-label="Termin löschen"
          className="text-xs text-muted hover:text-red-400"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
