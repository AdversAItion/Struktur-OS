import { useCallback, useEffect, useState } from 'react'
import { insightErledigen, insightsLaden } from './api'
import type { Insight, Prioritaet } from './types'

/**
 * Zeigt die system-generierten Handlungsempfehlungen (Session 8) für den
 * gewählten Monat — nur was die RLS für Führungskraft/Master freigibt. Ist die
 * Liste leer, erscheint gar nichts (kein Rauschen).
 */
export function InsightsPanel({ monat }: { monat: string }) {
  const [insights, setInsights] = useState<Insight[] | null>(null)

  const laden = useCallback(() => {
    return insightsLaden(monat)
      .then(setInsights)
      // Insights sind Kür — ein Ladefehler (z. B. Tabelle noch nicht gepusht)
      // soll das Dashboard nicht blockieren.
      .catch(() => setInsights([]))
  }, [monat])

  useEffect(() => {
    void laden()
  }, [laden])

  async function erledigen(id: string) {
    setInsights((liste) => (liste ?? []).filter((i) => i.id !== id))
    try {
      await insightErledigen(id)
    } catch {
      await laden() // bei Fehler zurückholen
    }
  }

  if (!insights || insights.length === 0) return null

  return (
    <div className="mt-5">
      <p className="num text-xs tracking-widest text-gold uppercase">
        Handlungsbedarf · {insights.length}
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {insights.map((i) => (
          <InsightKarte key={i.id} insight={i} onErledigt={() => void erledigen(i.id)} />
        ))}
      </div>
    </div>
  )
}

const PUNKT: Record<Prioritaet, string> = {
  hoch: 'bg-red-400',
  mittel: 'bg-gold',
  niedrig: 'bg-muted',
}

function InsightKarte({ insight, onErledigt }: { insight: Insight; onErledigt: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-panel p-4">
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${PUNKT[insight.prioritaet]}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="num text-xs text-muted">{insight.fakt}</p>
        <p className="mt-0.5 text-sm font-bold text-text">{insight.empfehlung}</p>
      </div>
      <button
        type="button"
        onClick={onErledigt}
        aria-label="Als erledigt markieren"
        title="Erledigt"
        className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-gold hover:text-gold"
      >
        Erledigt
      </button>
    </div>
  )
}
