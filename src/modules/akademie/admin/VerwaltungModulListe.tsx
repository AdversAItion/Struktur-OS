import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROLLEN_LABEL, type Rolle } from '@/modules/auth/types'
import { alleModuleLaden, modulAnlegen, modulLoeschen, reihenfolgeTauschen } from '../api'
import { KATEGORIE_LABEL, type AkademieKategorie, type AkademieModul, type ModulEingabe } from '../types'
import { Auswahl, Feld, Fehlerzeile, MiniButton, Textbereich } from './felder'

const KATEGORIE_OPTIONEN: { wert: AkademieKategorie; label: string }[] = (
  Object.keys(KATEGORIE_LABEL) as AkademieKategorie[]
).map((k) => ({ wert: k, label: KATEGORIE_LABEL[k] }))

const ROLLE_OPTIONEN: { wert: Rolle; label: string }[] = (
  ['gp_frisch', 'gp_stufe2', 'fuehrungskraft', 'master'] as Rolle[]
).map((r) => ({ wert: r, label: ROLLEN_LABEL[r] }))

// Karrierestufe als optionale Zusatz-Freischaltung ('' = keine, sonst 1–6).
const STUFE_OPTIONEN: { wert: string; label: string }[] = [
  { wert: '', label: 'Keine' },
  ...[1, 2, 3, 4, 5, 6].map((s) => ({ wert: String(s), label: `ab Stufe ${s}` })),
]

export function VerwaltungModulListe() {
  const [module, setModule] = useState<AkademieModul[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [formOffen, setFormOffen] = useState(false)

  const laden = useCallback(() => {
    setFehler(null)
    return alleModuleLaden()
      .then(setModule)
      .catch((e: unknown) => setFehler(e instanceof Error ? e.message : 'Laden fehlgeschlagen.'))
  }, [])

  useEffect(() => {
    void laden()
  }, [laden])

  async function verschieben(index: number, richtung: -1 | 1) {
    if (!module) return
    const a = module[index]
    // Tauschen nur innerhalb derselben Kategorie (so ist die Liste gruppiert).
    const b = module[index + richtung]
    if (!a || !b || a.kategorie !== b.kategorie) return
    try {
      await reihenfolgeTauschen('akademie_module', a, b)
      await laden()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Sortieren fehlgeschlagen.')
    }
  }

  async function loeschen(modul: AkademieModul) {
    if (!confirm(`Modul „${modul.titel}" und alle seine Lektionen/Tests löschen?`)) return
    try {
      await modulLoeschen(modul.id)
      await laden()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Löschen fehlgeschlagen.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/akademie" className="text-sm text-muted hover:text-text">
        ← Akademie
      </Link>
      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl leading-tight font-extrabold">Verwaltung</h1>
        <button
          type="button"
          onClick={() => setFormOffen((o) => !o)}
          className="shrink-0 rounded-lg bg-gold px-4 py-2 font-display text-sm font-bold text-bg transition-opacity hover:opacity-90"
        >
          {formOffen ? 'Abbrechen' : '+ Modul'}
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">Module, Lektionen und Tests pflegen.</p>

      {formOffen && (
        <ModulForm
          onGespeichert={async () => {
            setFormOffen(false)
            await laden()
          }}
        />
      )}

      <div className="mt-4">
        <Fehlerzeile>{fehler}</Fehlerzeile>
      </div>

      {module === null && !fehler && <p className="num mt-4 text-sm text-muted">Lädt ...</p>}

      {module !== null && module.length === 0 && (
        <p className="mt-4 text-sm text-muted">
          Noch keine Module. Leg mit „+ Modul" das erste an.
        </p>
      )}

      {module !== null && module.length > 0 && (
        <div className="mt-4 flex flex-col gap-6">
          {gruppiere(module).map(([kategorie, gruppe]) => (
            <div key={kategorie}>
              <p className="num text-xs tracking-widest text-muted uppercase">
                {KATEGORIE_LABEL[kategorie]}
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {gruppe.map((modul) => {
                  const globalerIndex = module.indexOf(modul)
                  const istErstes = gruppe[0]?.id === modul.id
                  const istLetztes = gruppe[gruppe.length - 1]?.id === modul.id
                  return (
                    <div
                      key={modul.id}
                      className="flex items-center gap-2 rounded-xl border border-line bg-panel p-3"
                    >
                      <div className="flex flex-col gap-1">
                        <MiniButton
                          onClick={() => void verschieben(globalerIndex, -1)}
                          disabled={istErstes}
                          titel="Nach oben"
                        >
                          ↑
                        </MiniButton>
                        <MiniButton
                          onClick={() => void verschieben(globalerIndex, 1)}
                          disabled={istLetztes}
                          titel="Nach unten"
                        >
                          ↓
                        </MiniButton>
                      </div>

                      <Link to={`/akademie/verwaltung/modul/${modul.id}`} className="min-w-0 flex-1">
                        <p className="truncate font-display font-bold text-text">{modul.titel}</p>
                        <p className="num mt-0.5 text-xs text-muted">
                          ab {ROLLEN_LABEL[modul.min_role]}
                        </p>
                      </Link>

                      <MiniButton onClick={() => void loeschen(modul)} gefahr titel="Löschen">
                        Löschen
                      </MiniButton>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ModulForm({ onGespeichert }: { onGespeichert: () => void }) {
  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [kategorie, setKategorie] = useState<AkademieKategorie>('ergo_basics')
  const [minRole, setMinRole] = useState<Rolle>('gp_frisch')
  const [minStufe, setMinStufe] = useState<string>('')
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function speichern() {
    if (!titel.trim()) {
      setFehler('Titel darf nicht leer sein.')
      return
    }
    setSpeichert(true)
    setFehler(null)
    const eingabe: ModulEingabe = {
      titel: titel.trim(),
      beschreibung: beschreibung.trim() || null,
      kategorie,
      min_role: minRole,
      min_stufe: minStufe === '' ? null : Number(minStufe),
    }
    try {
      await modulAnlegen(eingabe)
      onGespeichert()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-4 rounded-xl border border-line bg-panel p-5">
      <p className="num text-xs tracking-widest text-gold uppercase">Neues Modul</p>
      <Feld label="Titel" wert={titel} setzen={setTitel} platzhalter="z. B. Ankommen" />
      <Textbereich
        label="Beschreibung"
        wert={beschreibung}
        setzen={setBeschreibung}
        zeilen={2}
        platzhalter="Optional, ein Satz"
      />
      <div className="grid grid-cols-3 gap-3">
        <Auswahl label="Kategorie" wert={kategorie} setzen={setKategorie} optionen={KATEGORIE_OPTIONEN} />
        <Auswahl label="Rolle ab" wert={minRole} setzen={setMinRole} optionen={ROLLE_OPTIONEN} />
        <Auswahl label="Stufe ab" wert={minStufe} setzen={setMinStufe} optionen={STUFE_OPTIONEN} />
      </div>
      <Fehlerzeile>{fehler}</Fehlerzeile>
      <button
        type="button"
        onClick={() => void speichern()}
        disabled={speichert}
        className="rounded-lg bg-gold px-4 py-3 font-display font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {speichert ? 'Speichert ...' : 'Modul anlegen'}
      </button>
    </div>
  )
}

function gruppiere(module: AkademieModul[]): [AkademieKategorie, AkademieModul[]][] {
  const gruppen = new Map<AkademieKategorie, AkademieModul[]>()
  for (const m of module) {
    const liste = gruppen.get(m.kategorie) ?? []
    liste.push(m)
    gruppen.set(m.kategorie, liste)
  }
  return [...gruppen.entries()]
}
