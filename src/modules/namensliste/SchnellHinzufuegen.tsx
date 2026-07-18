import { useState } from 'react'
import { kontaktAnlegen } from './api'
import { KATEGORIEN, KATEGORIE_LABEL, type Kategorie } from './types'

/**
 * Kompaktes „Name + Kategorie → Hinzufügen". Wird in der Liste und im Interview
 * genutzt, damit dem GP einfallende Namen sofort in der Liste landen.
 */
export function SchnellHinzufuegen({
  partnerId,
  onHinzugefuegt,
}: {
  partnerId: string
  onHinzugefuegt: () => void | Promise<void>
}) {
  const [name, setName] = useState('')
  const [kategorie, setKategorie] = useState<Kategorie>('B')
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function hinzufuegen() {
    if (!name.trim()) return
    setSpeichert(true)
    setFehler(null)
    try {
      await kontaktAnlegen(partnerId, { name: name.trim(), kategorie })
      setName('')
      await onHinzugefuegt()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Konnte nicht gespeichert werden.')
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void hinzufuegen()
          }}
          placeholder="Name eintragen ..."
          className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2.5 text-text placeholder:text-muted focus:border-gold focus:outline-none"
        />
        <select
          value={kategorie}
          onChange={(e) => setKategorie(e.target.value as Kategorie)}
          aria-label="Kategorie"
          className="rounded-lg border border-line bg-panel px-2 py-2.5 text-text focus:border-gold focus:outline-none"
        >
          {KATEGORIEN.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void hinzufuegen()}
          disabled={speichert || !name.trim()}
          className="shrink-0 rounded-lg bg-gold px-4 py-2.5 font-display text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          +
        </button>
      </div>
      <p className="num mt-1 text-[10px] text-muted">
        {KATEGORIE_LABEL[kategorie]}
      </p>
      {fehler && (
        <p role="alert" className="mt-1 text-sm text-red-400">
          {fehler}
        </p>
      )}
    </div>
  )
}
