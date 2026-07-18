import type { ReactNode } from 'react'

/**
 * Geteilte Formularfelder für die Verwaltung. Halten Label + Eingabe konsistent
 * auf den Design-Tokens aus CLAUDE.md, damit die drei Editoren nicht jeweils
 * dieselben Tailwind-Klassen wiederholen.
 */

const LABEL = 'num text-xs tracking-wider text-muted uppercase'
const INPUT =
  'mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-text placeholder:text-muted focus:border-gold focus:outline-none'

export function Feld({
  label,
  wert,
  setzen,
  typ = 'text',
  platzhalter,
}: {
  label: string
  wert: string
  setzen: (w: string) => void
  typ?: string
  platzhalter?: string
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <input
        type={typ}
        value={wert}
        onChange={(e) => setzen(e.target.value)}
        placeholder={platzhalter}
        className={INPUT}
      />
    </label>
  )
}

export function Textbereich({
  label,
  wert,
  setzen,
  zeilen = 6,
  platzhalter,
}: {
  label: string
  wert: string
  setzen: (w: string) => void
  zeilen?: number
  platzhalter?: string
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <textarea
        value={wert}
        onChange={(e) => setzen(e.target.value)}
        rows={zeilen}
        placeholder={platzhalter}
        className={`${INPUT} resize-y font-mono text-sm leading-relaxed`}
      />
    </label>
  )
}

export function Auswahl<T extends string>({
  label,
  wert,
  setzen,
  optionen,
}: {
  label: string
  wert: T
  setzen: (w: T) => void
  optionen: { wert: T; label: string }[]
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <select
        value={wert}
        onChange={(e) => setzen(e.target.value as T)}
        className={INPUT}
      >
        {optionen.map((o) => (
          <option key={o.wert} value={o.wert}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Fehlerzeile({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="text-sm text-red-400">
      {children}
    </p>
  )
}

/** Kleiner Sekundär-Button für Aktionen wie Hoch/Runter/Löschen. */
export function MiniButton({
  children,
  onClick,
  disabled,
  gefahr,
  titel,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  gefahr?: boolean
  titel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={titel}
      aria-label={titel}
      className={`rounded-lg border px-2.5 py-1.5 text-sm transition-colors disabled:opacity-30 ${
        gefahr
          ? 'border-line text-muted hover:border-red-400 hover:text-red-400'
          : 'border-line text-muted hover:border-gold hover:text-gold'
      }`}
    >
      {children}
    </button>
  )
}
