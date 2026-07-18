import { kontaktKategorieSetzen, kontaktLoeschen, kontaktStatusSetzen } from './api'
import { SchnellHinzufuegen } from './SchnellHinzufuegen'
import { KATEGORIEN, KATEGORIE_LABEL, type Kategorie, type Kontakt } from './types'

export function KontaktListe({
  partnerId,
  kontakte,
  onAenderung,
}: {
  partnerId: string
  kontakte: Kontakt[]
  onAenderung: () => Promise<void>
}) {
  async function loeschen(k: Kontakt) {
    if (!confirm(`„${k.name}" aus der Namensliste löschen?`)) return
    await kontaktLoeschen(k.id)
    await onAenderung()
  }

  return (
    <div>
      <div className="rounded-xl border border-line bg-panel p-4">
        <p className="num text-xs tracking-widest text-gold uppercase">Kontakt hinzufügen</p>
        <div className="mt-2">
          <SchnellHinzufuegen partnerId={partnerId} onHinzugefuegt={onAenderung} />
        </div>
      </div>

      {kontakte.length === 0 && (
        <p className="mt-4 text-sm text-muted">
          Noch keine Kontakte. Trag oben welche ein oder starte das KI-Interview.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-6">
        {KATEGORIEN.map((kat) => {
          const gruppe = kontakte.filter((k) => k.kategorie === kat)
          if (gruppe.length === 0) return null
          return (
            <div key={kat}>
              <p className="num text-xs tracking-widest text-muted uppercase">
                {KATEGORIE_LABEL[kat]} · {gruppe.length}
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {gruppe.map((k) => (
                  <KontaktZeile
                    key={k.id}
                    kontakt={k}
                    onKategorie={async (neu) => {
                      await kontaktKategorieSetzen(k.id, neu)
                      await onAenderung()
                    }}
                    onStatus={async () => {
                      await kontaktStatusSetzen(k.id, k.status === 'offen' ? 'kontaktiert' : 'offen')
                      await onAenderung()
                    }}
                    onLoeschen={() => void loeschen(k)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KontaktZeile({
  kontakt,
  onKategorie,
  onStatus,
  onLoeschen,
}: {
  kontakt: Kontakt
  onKategorie: (k: Kategorie) => void | Promise<void>
  onStatus: () => void | Promise<void>
  onLoeschen: () => void
}) {
  const kontaktiert = kontakt.status === 'kontaktiert'
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-panel p-3">
      <button
        type="button"
        onClick={() => void onStatus()}
        title={kontaktiert ? 'Als offen markieren' : 'Als kontaktiert markieren'}
        aria-label={kontaktiert ? 'Als offen markieren' : 'Als kontaktiert markieren'}
        className={`flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
          kontaktiert ? 'border-gold bg-gold text-bg' : 'border-line text-muted hover:border-gold'
        }`}
      >
        {kontaktiert ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : null}
      </button>

      <p className={`min-w-0 flex-1 truncate font-display font-bold ${kontaktiert ? 'text-muted line-through' : 'text-text'}`}>
        {kontakt.name}
      </p>

      <select
        value={kontakt.kategorie}
        onChange={(e) => void onKategorie(e.target.value as Kategorie)}
        aria-label="Kategorie ändern"
        className="shrink-0 rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-text focus:border-gold focus:outline-none"
      >
        {KATEGORIEN.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onLoeschen}
        aria-label="Löschen"
        className="shrink-0 px-1.5 text-sm text-muted hover:text-red-400"
      >
        ✕
      </button>
    </div>
  )
}
