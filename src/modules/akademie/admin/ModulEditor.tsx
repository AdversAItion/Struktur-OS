import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ROLLEN_LABEL, type Rolle } from '@/modules/auth/types'
import {
  lektionAnlegen,
  lektionenLaden,
  lektionLoeschen,
  modulAktualisieren,
  modulLaden,
  modulLoeschen,
  reihenfolgeTauschen,
} from '../api'
import {
  KATEGORIE_LABEL,
  type AkademieKategorie,
  type AkademieLektion,
  type AkademieModul,
  type ModulEingabe,
} from '../types'
import { Auswahl, Feld, Fehlerzeile, MiniButton, Textbereich } from './felder'

const KATEGORIE_OPTIONEN: { wert: AkademieKategorie; label: string }[] = (
  Object.keys(KATEGORIE_LABEL) as AkademieKategorie[]
).map((k) => ({ wert: k, label: KATEGORIE_LABEL[k] }))

const ROLLE_OPTIONEN: { wert: Rolle; label: string }[] = (
  ['gp_frisch', 'gp_stufe2', 'fuehrungskraft', 'master'] as Rolle[]
).map((r) => ({ wert: r, label: ROLLEN_LABEL[r] }))

export function ModulEditor() {
  const { modulId } = useParams<{ modulId: string }>()
  const navigate = useNavigate()

  const [modul, setModul] = useState<AkademieModul | null | undefined>(undefined)
  const [lektionen, setLektionen] = useState<AkademieLektion[]>([])
  const [fehler, setFehler] = useState<string | null>(null)

  const laden = useCallback(() => {
    if (!modulId) return Promise.resolve()
    setFehler(null)
    return Promise.all([modulLaden(modulId), lektionenLaden(modulId)])
      .then(([m, l]) => {
        setModul(m)
        setLektionen(l)
      })
      .catch((e: unknown) => setFehler(e instanceof Error ? e.message : 'Laden fehlgeschlagen.'))
  }, [modulId])

  useEffect(() => {
    void laden()
  }, [laden])

  if (modul === undefined) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="num text-sm text-muted">Lädt ...</p>
      </div>
    )
  }

  if (modul === null) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link to="/akademie/verwaltung" className="text-sm text-muted hover:text-text">
          ← Verwaltung
        </Link>
        <p className="mt-4 text-sm text-muted">Modul nicht gefunden.</p>
      </div>
    )
  }

  async function verschieben(index: number, richtung: -1 | 1) {
    const a = lektionen[index]
    const b = lektionen[index + richtung]
    if (!a || !b) return
    try {
      await reihenfolgeTauschen('akademie_lektionen', a, b)
      await laden()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Sortieren fehlgeschlagen.')
    }
  }

  async function lektionEntfernen(lektion: AkademieLektion) {
    if (!confirm(`Lektion „${lektion.titel}" und ihre Tests löschen?`)) return
    try {
      await lektionLoeschen(lektion.id)
      await laden()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Löschen fehlgeschlagen.')
    }
  }

  async function modulEntfernen() {
    if (!confirm(`Ganzes Modul „${modul!.titel}" löschen?`)) return
    try {
      await modulLoeschen(modul!.id)
      navigate('/akademie/verwaltung')
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Löschen fehlgeschlagen.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/akademie/verwaltung" className="text-sm text-muted hover:text-text">
        ← Verwaltung
      </Link>
      <h1 className="mt-3 font-display text-2xl leading-tight font-extrabold md:text-3xl">
        {modul.titel}
      </h1>

      <div className="mt-4">
        <Fehlerzeile>{fehler}</Fehlerzeile>
      </div>

      <ModulStammdaten modul={modul} onGespeichert={laden} />

      <div className="mt-8">
        <p className="num text-xs tracking-widest text-gold uppercase">Lektionen</p>
        <div className="mt-3 flex flex-col gap-2">
          {lektionen.length === 0 && (
            <p className="text-sm text-muted">Noch keine Lektionen in diesem Modul.</p>
          )}
          {lektionen.map((lektion, i) => (
            <div
              key={lektion.id}
              className="flex items-center gap-2 rounded-xl border border-line bg-panel p-3"
            >
              <div className="flex flex-col gap-1">
                <MiniButton onClick={() => void verschieben(i, -1)} disabled={i === 0} titel="Nach oben">
                  ↑
                </MiniButton>
                <MiniButton
                  onClick={() => void verschieben(i, 1)}
                  disabled={i === lektionen.length - 1}
                  titel="Nach unten"
                >
                  ↓
                </MiniButton>
              </div>
              <Link to={`/akademie/verwaltung/lektion/${lektion.id}`} className="min-w-0 flex-1">
                <p className="truncate font-display font-bold text-text">{lektion.titel}</p>
                <p className="num mt-0.5 text-xs text-muted">
                  {lektion.video_url ? 'Video' : 'kein Video'}
                  {lektion.inhalt_markdown ? ' · Text' : ''}
                </p>
              </Link>
              <MiniButton onClick={() => void lektionEntfernen(lektion)} gefahr titel="Löschen">
                Löschen
              </MiniButton>
            </div>
          ))}
        </div>

        <NeueLektion modulId={modul.id} onGespeichert={laden} />
      </div>

      <div className="mt-10 border-t border-line pt-5">
        <MiniButton onClick={() => void modulEntfernen()} gefahr titel="Modul löschen">
          Modul löschen
        </MiniButton>
      </div>
    </div>
  )
}

function ModulStammdaten({
  modul,
  onGespeichert,
}: {
  modul: AkademieModul
  onGespeichert: () => Promise<void>
}) {
  const [titel, setTitel] = useState(modul.titel)
  const [beschreibung, setBeschreibung] = useState(modul.beschreibung ?? '')
  const [kategorie, setKategorie] = useState<AkademieKategorie>(modul.kategorie)
  const [minRole, setMinRole] = useState<Rolle>(modul.min_role)
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [gespeichert, setGespeichert] = useState(false)

  async function speichern() {
    if (!titel.trim()) {
      setFehler('Titel darf nicht leer sein.')
      return
    }
    setSpeichert(true)
    setFehler(null)
    setGespeichert(false)
    const eingabe: ModulEingabe = {
      titel: titel.trim(),
      beschreibung: beschreibung.trim() || null,
      kategorie,
      min_role: minRole,
    }
    try {
      await modulAktualisieren(modul.id, eingabe)
      await onGespeichert()
      setGespeichert(true)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5">
      <p className="num text-xs tracking-widest text-muted uppercase">Stammdaten</p>
      <Feld label="Titel" wert={titel} setzen={setTitel} />
      <Textbereich label="Beschreibung" wert={beschreibung} setzen={setBeschreibung} zeilen={2} />
      <div className="grid grid-cols-2 gap-3">
        <Auswahl label="Kategorie" wert={kategorie} setzen={setKategorie} optionen={KATEGORIE_OPTIONEN} />
        <Auswahl label="Sichtbar ab" wert={minRole} setzen={setMinRole} optionen={ROLLE_OPTIONEN} />
      </div>
      <Fehlerzeile>{fehler}</Fehlerzeile>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void speichern()}
          disabled={speichert}
          className="rounded-lg bg-gold px-4 py-2.5 font-display text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {speichert ? 'Speichert ...' : 'Speichern'}
        </button>
        {gespeichert && <span className="num text-xs text-gold">Gespeichert.</span>}
      </div>
    </div>
  )
}

function NeueLektion({
  modulId,
  onGespeichert,
}: {
  modulId: string
  onGespeichert: () => Promise<void>
}) {
  const [offen, setOffen] = useState(false)
  const [titel, setTitel] = useState('')
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function anlegen() {
    if (!titel.trim()) {
      setFehler('Titel darf nicht leer sein.')
      return
    }
    setSpeichert(true)
    setFehler(null)
    try {
      await lektionAnlegen(modulId, { titel: titel.trim(), video_url: null, inhalt_markdown: null })
      setTitel('')
      setOffen(false)
      await onGespeichert()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Anlegen fehlgeschlagen.')
    } finally {
      setSpeichert(false)
    }
  }

  if (!offen) {
    return (
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="mt-3 w-full rounded-lg border border-line px-4 py-3 font-display text-sm font-bold text-text transition-colors hover:border-gold"
      >
        + Lektion hinzufügen
      </button>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
      <Feld label="Titel der Lektion" wert={titel} setzen={setTitel} platzhalter="z. B. Begrüßung" />
      <Fehlerzeile>{fehler}</Fehlerzeile>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void anlegen()}
          disabled={speichert}
          className="rounded-lg bg-gold px-4 py-2.5 font-display text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {speichert ? 'Legt an ...' : 'Anlegen'}
        </button>
        <button
          type="button"
          onClick={() => setOffen(false)}
          className="rounded-lg border border-line px-4 py-2.5 text-sm text-muted hover:text-text"
        >
          Abbrechen
        </button>
      </div>
      <p className="text-xs text-muted">Video und Inhalt fügst du gleich im Lektions-Editor hinzu.</p>
    </div>
  )
}
