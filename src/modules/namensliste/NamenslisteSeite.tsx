import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/modules/auth/kontext'
import { kontakteLaden } from './api'
import { Interview } from './Interview'
import { KontaktListe } from './KontaktListe'
import type { Kontakt } from './types'

type Tab = 'liste' | 'interview'

export function NamenslisteSeite() {
  const { partner } = useAuth()
  const [tab, setTab] = useState<Tab>('liste')
  const [kontakte, setKontakte] = useState<Kontakt[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  const laden = useCallback(async () => {
    if (!partner) return
    setFehler(null)
    try {
      setKontakte(await kontakteLaden(partner.id))
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Kontakte konnten nicht geladen werden.')
    }
  }, [partner])

  useEffect(() => {
    void laden()
  }, [laden])

  if (!partner) return null

  const anzahl = kontakte?.length ?? 0

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl leading-tight font-extrabold">Namensliste</h1>
      <p className="mt-2 text-sm text-muted">
        Alle Menschen, die du kennst — {anzahl} {anzahl === 1 ? 'Kontakt' : 'Kontakte'}.
      </p>

      <div className="mt-5 flex gap-1 rounded-xl border border-line bg-panel p-1">
        <TabKnopf aktiv={tab === 'liste'} onClick={() => setTab('liste')}>
          Liste
        </TabKnopf>
        <TabKnopf aktiv={tab === 'interview'} onClick={() => setTab('interview')}>
          KI-Interview
        </TabKnopf>
      </div>

      {fehler && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {fehler}
        </p>
      )}

      {kontakte === null && !fehler && <p className="num mt-4 text-sm text-muted">Lädt ...</p>}

      {kontakte !== null && (
        <div className="mt-4">
          {tab === 'liste' ? (
            <KontaktListe partnerId={partner.id} kontakte={kontakte} onAenderung={laden} />
          ) : (
            <Interview
              partnerId={partner.id}
              kontakteAnzahl={anzahl}
              onKontaktHinzugefuegt={laden}
            />
          )}
        </div>
      )}
    </div>
  )
}

function TabKnopf({
  aktiv,
  onClick,
  children,
}: {
  aktiv: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-4 py-2 font-display text-sm font-bold transition-colors ${
        aktiv ? 'bg-gold text-bg' : 'text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  )
}
