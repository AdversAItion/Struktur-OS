import { Platzhalter } from './Platzhalter'

export function Namensliste() {
  return (
    <Platzhalter
      titel="Namensliste"
      zweck="KI-gestützte Kontaktliste für den Aufbau."
      kommt={
        <>
          Wird das Modul{' '}
          <code className="text-text">src/modules/namensliste/</code>. Braucht
          eine eigene Migration (Tabellen noch nicht entworfen) und eine Supabase
          Edge Function für die Anthropic-API — der Key darf nie ins Frontend.
        </>
      }
    />
  )
}
