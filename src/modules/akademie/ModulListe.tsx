import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/modules/auth/kontext'
import { moduleMitFortschrittLaden } from './api'
import { KATEGORIE_LABEL, type AkademieKategorie, type ModulMitFortschritt } from './types'

export function ModulListe() {
  const { partner } = useAuth()
  const [module, setModule] = useState<ModulMitFortschritt[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    if (!partner) return
    let abgebrochen = false
    moduleMitFortschrittLaden(partner.id)
      .then((m) => {
        if (!abgebrochen) setModule(m)
      })
      .catch((err: unknown) => {
        if (!abgebrochen) {
          setFehler(err instanceof Error ? err.message : 'Module konnten nicht geladen werden.')
        }
      })
    return () => {
      abgebrochen = true
    }
  }, [partner])

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl leading-tight font-extrabold">Akademie</h1>
      <p className="mt-2 text-sm text-muted">
        Onboarding und Weiterbildung — freigeschaltet nach Rolle.
      </p>

      {fehler && (
        <p role="alert" className="mt-6 text-sm text-red-400">
          {fehler}
        </p>
      )}

      {!fehler && module === null && (
        <p className="mt-6 num text-sm text-muted">Lädt ...</p>
      )}

      {module !== null && module.length === 0 && (
        <p className="mt-6 text-sm text-muted">
          Noch keine Module freigeschaltet. Frag deine Führungskraft.
        </p>
      )}

      {module !== null && module.length > 0 && (
        <div className="mt-6 flex flex-col gap-6">
          {gruppiereNachKategorie(module).map(([kategorie, gruppe]) => (
            <div key={kategorie}>
              <p className="num text-xs tracking-widest text-muted uppercase">
                {KATEGORIE_LABEL[kategorie]}
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {gruppe.map((modul) => (
                  <ModulKarte key={modul.id} modul={modul} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ModulKarte({ modul }: { modul: ModulMitFortschritt }) {
  const fertig = modul.lektionenGesamt > 0 && modul.lektionenAbgeschlossen === modul.lektionenGesamt
  const anteil =
    modul.lektionenGesamt > 0 ? modul.lektionenAbgeschlossen / modul.lektionenGesamt : 0

  return (
    <Link
      to={`/akademie/modul/${modul.id}`}
      className="block rounded-xl border border-line bg-panel p-4 transition-colors hover:border-gold"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-bold text-text">{modul.titel}</p>
          {modul.beschreibung && (
            <p className="mt-1 text-sm text-muted">{modul.beschreibung}</p>
          )}
        </div>
        {fertig && (
          <span className="num shrink-0 rounded-full bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold">
            Fertig
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
          <div
            className="h-full rounded-full bg-gold transition-[width]"
            style={{ width: `${Math.round(anteil * 100)}%` }}
          />
        </div>
        <span className="num shrink-0 text-xs text-muted">
          {modul.lektionenAbgeschlossen}/{modul.lektionenGesamt}
        </span>
      </div>
    </Link>
  )
}

function gruppiereNachKategorie(
  module: ModulMitFortschritt[],
): [AkademieKategorie, ModulMitFortschritt[]][] {
  const gruppen = new Map<AkademieKategorie, ModulMitFortschritt[]>()
  for (const modul of module) {
    const liste = gruppen.get(modul.kategorie) ?? []
    liste.push(modul)
    gruppen.set(modul.kategorie, liste)
  }
  return [...gruppen.entries()]
}
