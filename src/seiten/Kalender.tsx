import { Platzhalter } from './Platzhalter'

export function Kalender() {
  return (
    <Platzhalter
      titel="Kalender"
      zweck="Termine und offene Aufgaben."
      kommt={
        <>
          Wird das Modul <code className="text-text">src/modules/kalender/</code>.
          Liest <code className="text-text">termine</code> und{' '}
          <code className="text-text">todos</code> (Migration 0002). Die
          Automatik aus <code className="text-text">onboarding_trigger</code>{' '}
          hängt sich später hier an.
        </>
      }
    />
  )
}
