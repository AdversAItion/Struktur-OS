import { Platzhalter } from './Platzhalter'

export function Dashboard() {
  return (
    <Platzhalter
      titel="Dashboard"
      zweck="Ziele und Einheiten der eigenen Struktur auf einen Blick."
      kommt={
        <>
          Wird das Modul <code className="text-text">src/modules/dashboard/</code>.
          Liest <code className="text-text">ziele</code> und{' '}
          <code className="text-text">einheiten</code> (Migration 0002) über die
          Struktur-Policies: Soll gegen Ist pro Partner und Monat.
        </>
      }
    />
  )
}
