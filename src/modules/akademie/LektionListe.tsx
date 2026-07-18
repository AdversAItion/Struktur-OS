import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/modules/auth/kontext'
import { lektionenMitFortschrittLaden, modulLaden } from './api'
import type { AkademieModul, LektionMitFortschritt } from './types'

export function LektionListe() {
  const { modulId } = useParams<{ modulId: string }>()
  const { partner } = useAuth()
  const [modul, setModul] = useState<AkademieModul | null | undefined>(undefined)
  const [lektionen, setLektionen] = useState<LektionMitFortschritt[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    if (!partner || !modulId) return
    let abgebrochen = false
    Promise.all([modulLaden(modulId), lektionenMitFortschrittLaden(modulId, partner.id)])
      .then(([m, l]) => {
        if (abgebrochen) return
        setModul(m)
        setLektionen(l)
      })
      .catch((err: unknown) => {
        if (!abgebrochen) {
          setFehler(err instanceof Error ? err.message : 'Lektionen konnten nicht geladen werden.')
        }
      })
    return () => {
      abgebrochen = true
    }
  }, [modulId, partner])

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/akademie" className="text-sm text-muted hover:text-text">
        ← Akademie
      </Link>

      {fehler && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {fehler}
        </p>
      )}

      {!fehler && modul === undefined && (
        <p className="mt-4 num text-sm text-muted">Lädt ...</p>
      )}

      {!fehler && modul === null && (
        <p className="mt-4 text-sm text-muted">
          Modul nicht gefunden oder noch nicht freigeschaltet.
        </p>
      )}

      {modul && (
        <>
          <h1 className="mt-3 font-display text-3xl leading-tight font-extrabold">
            {modul.titel}
          </h1>
          {modul.beschreibung && <p className="mt-2 text-sm text-muted">{modul.beschreibung}</p>}

          <div className="mt-6 flex flex-col gap-2">
            {lektionen !== null && lektionen.length === 0 && (
              <p className="text-sm text-muted">Für dieses Modul gibt es noch keine Lektionen.</p>
            )}
            {(lektionen ?? []).map((lektion, i) => (
              <Link
                key={lektion.id}
                to={`/akademie/lektion/${lektion.id}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-panel p-4 transition-colors hover:border-gold"
              >
                <StatusPunkt abgeschlossen={lektion.abgeschlossen} nummer={i + 1} />
                <span className="font-display font-bold text-text">{lektion.titel}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function StatusPunkt({ abgeschlossen, nummer }: { abgeschlossen: boolean; nummer: number }) {
  if (abgeschlossen) {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold text-bg">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-4"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    )
  }
  return (
    <span className="num flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-xs text-muted">
      {nummer}
    </span>
  )
}
