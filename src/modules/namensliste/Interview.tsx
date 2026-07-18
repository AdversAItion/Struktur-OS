import { useState, type FormEvent } from 'react'
import { interviewSenden } from './api'
import { SchnellHinzufuegen } from './SchnellHinzufuegen'
import type { ChatNachricht } from './types'

// Lokaler Begrüßungstext — reine UI, wird NICHT an die API geschickt (die
// erwartet einen Verlauf, der mit einer Nutzer-Nachricht beginnt).
const OPENER =
  'Lass uns deine Namensliste aufbauen. Wir gehen deine Kontakte in Ruhe durch — Kategorie für Kategorie. Fang leicht an: Wer gehört zu deiner engsten Familie?'

export function Interview({
  partnerId,
  kontakteAnzahl,
  onKontaktHinzugefuegt,
}: {
  partnerId: string
  kontakteAnzahl: number
  onKontaktHinzugefuegt: () => Promise<void>
}) {
  const [verlauf, setVerlauf] = useState<ChatNachricht[]>([{ rolle: 'assistant', text: OPENER }])
  const [eingabe, setEingabe] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function absenden(e: FormEvent) {
    e.preventDefault()
    const text = eingabe.trim()
    if (!text || laeuft) return

    const neuerVerlauf: ChatNachricht[] = [...verlauf, { rolle: 'user', text }]
    setVerlauf(neuerVerlauf)
    setEingabe('')
    setLaeuft(true)
    setFehler(null)
    try {
      const antwort = await interviewSenden(neuerVerlauf)
      setVerlauf((v) => [...v, { rolle: 'assistant', text: antwort }])
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Das Interview ist gerade nicht erreichbar.')
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-line bg-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="num text-xs tracking-widest text-gold uppercase">Kontakt eintragen</p>
          <span className="num text-xs text-muted">{kontakteAnzahl} in der Liste</span>
        </div>
        <div className="mt-2">
          <SchnellHinzufuegen partnerId={partnerId} onHinzugefuegt={onKontaktHinzugefuegt} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {verlauf.map((n, i) => (
          <ChatBlase key={i} nachricht={n} />
        ))}
        {laeuft && (
          <div className="self-start rounded-2xl rounded-bl-sm border border-line bg-panel px-4 py-2.5">
            <span className="num text-sm text-muted">tippt ...</span>
          </div>
        )}
      </div>

      {fehler && (
        <p role="alert" className="text-sm text-red-400">
          {fehler}
        </p>
      )}

      <form onSubmit={absenden} className="sticky bottom-20 flex gap-2 md:bottom-0">
        <input
          type="text"
          value={eingabe}
          onChange={(e) => setEingabe(e.target.value)}
          placeholder="Antworten ..."
          className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-3 text-text placeholder:text-muted focus:border-gold focus:outline-none"
        />
        <button
          type="submit"
          disabled={laeuft || !eingabe.trim()}
          className="shrink-0 rounded-lg bg-gold px-5 py-3 font-display font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Senden
        </button>
      </form>
    </div>
  )
}

function ChatBlase({ nachricht }: { nachricht: ChatNachricht }) {
  const istKi = nachricht.rolle === 'assistant'
  return (
    <div
      className={
        istKi
          ? 'max-w-[85%] self-start rounded-2xl rounded-bl-sm border border-line bg-panel px-4 py-2.5'
          : 'max-w-[85%] self-end rounded-2xl rounded-br-sm bg-gold/15 px-4 py-2.5'
      }
    >
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-text">{nachricht.text}</p>
    </div>
  )
}
