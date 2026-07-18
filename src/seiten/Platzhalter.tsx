import type { ReactNode } from 'react'

/**
 * Gerüst für die noch nicht gebauten Bereiche. Zeigt bewusst nur, was gesichert
 * ist — keine erfundenen Kennzahlen, keine Blind-Widgets. Jede dieser Seiten
 * wird später durch ein echtes Modul unter src/modules/<name>/ ersetzt.
 */
export function Platzhalter({
  titel,
  zweck,
  kommt,
}: {
  titel: string
  /** Wofür der Bereich da ist — in einem Satz. */
  zweck: string
  /** Was hier konkret entstehen wird. */
  kommt: ReactNode
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl leading-tight font-extrabold">
        {titel}
      </h1>
      <p className="mt-2 text-sm text-muted">{zweck}</p>

      <div className="mt-6 rounded-xl border border-line bg-panel p-5">
        <p className="num text-xs tracking-wider text-gold uppercase">
          Noch nicht gebaut
        </p>
        <div className="mt-2 text-sm text-muted">{kommt}</div>
      </div>
    </div>
  )
}
