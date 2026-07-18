import { useState } from 'react'
import { todoAnlegen, todoErledigtSetzen, todoLoeschen } from './api'
import { datumKurz } from './format'
import { istUeberfaellig, sortiereErledigteTodos, sortiereOffeneTodos } from './gruppierung'
import { TODO_QUELLE_LABEL, type Todo } from './types'

const INPUT =
  'mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-text placeholder:text-muted focus:border-gold focus:outline-none'
const LABEL = 'num text-xs tracking-wider text-muted uppercase'

export function TodoBereich({
  partnerId,
  todos,
  onGeaendert,
}: {
  partnerId: string
  todos: Todo[]
  onGeaendert: () => Promise<void>
}) {
  const [formularOffen, setFormularOffen] = useState(false)
  const [erledigteOffen, setErledigteOffen] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const offene = sortiereOffeneTodos(todos)
  const erledigte = sortiereErledigteTodos(todos)

  async function erledigtSetzen(id: string, erledigt: boolean) {
    setFehler(null)
    try {
      await todoErledigtSetzen(id, erledigt)
      await onGeaendert()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Ändern fehlgeschlagen.')
    }
  }

  async function loeschen(id: string) {
    if (!confirm('Dieses To-do löschen?')) return
    setFehler(null)
    try {
      await todoLoeschen(id)
      await onGeaendert()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Löschen fehlgeschlagen.')
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-text">To-dos</h2>
        <button
          type="button"
          onClick={() => setFormularOffen((o) => !o)}
          className="num rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-gold transition-colors hover:border-gold"
        >
          {formularOffen ? 'Abbrechen' : '+ To-do'}
        </button>
      </div>

      {fehler && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {fehler}
        </p>
      )}

      {formularOffen && (
        <TodoFormular
          partnerId={partnerId}
          onAngelegt={async () => {
            setFormularOffen(false)
            await onGeaendert()
          }}
        />
      )}

      <div className="mt-4 flex flex-col gap-2">
        {offene.length === 0 && <p className="text-sm text-muted">Keine offenen To-dos.</p>}
        {offene.map((t) => (
          <TodoZeile key={t.id} todo={t} onErledigt={erledigtSetzen} onLoeschen={loeschen} />
        ))}
      </div>

      {erledigte.length > 0 && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setErledigteOffen((o) => !o)}
            className="num text-xs tracking-wider text-muted uppercase hover:text-text"
          >
            {erledigteOffen
              ? '− Erledigte ausblenden'
              : `+ Erledigte anzeigen (${erledigte.length})`}
          </button>
          {erledigteOffen && (
            <div className="mt-2 flex flex-col gap-2">
              {erledigte.map((t) => (
                <TodoZeile key={t.id} todo={t} onErledigt={erledigtSetzen} onLoeschen={loeschen} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function TodoFormular({
  partnerId,
  onAngelegt,
}: {
  partnerId: string
  onAngelegt: () => Promise<void>
}) {
  const [titel, setTitel] = useState('')
  const [faelligAm, setFaelligAm] = useState('')
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function anlegen() {
    if (titel.trim() === '') {
      setFehler('Bitte einen Titel eingeben.')
      return
    }
    setSpeichert(true)
    setFehler(null)
    try {
      await todoAnlegen(partnerId, { titel: titel.trim(), faellig_am: faelligAm || null })
      setTitel('')
      setFaelligAm('')
      await onAngelegt()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Anlegen fehlgeschlagen.')
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
      <label className="block">
        <span className={LABEL}>Titel</span>
        <input
          type="text"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Was ist zu tun?"
          className={INPUT}
        />
      </label>
      <label className="block">
        <span className={LABEL}>Fällig am (optional)</span>
        <input
          type="date"
          value={faelligAm}
          onChange={(e) => setFaelligAm(e.target.value)}
          className={INPUT}
        />
      </label>
      {fehler && (
        <p role="alert" className="text-sm text-red-400">
          {fehler}
        </p>
      )}
      <button
        type="button"
        onClick={() => void anlegen()}
        disabled={speichert}
        className="rounded-lg bg-gold px-4 py-2.5 font-display text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {speichert ? 'Speichert ...' : 'To-do anlegen'}
      </button>
    </div>
  )
}

function TodoZeile({
  todo,
  onErledigt,
  onLoeschen,
}: {
  todo: Todo
  onErledigt: (id: string, erledigt: boolean) => Promise<void>
  onLoeschen: (id: string) => Promise<void>
}) {
  const ueberfaellig = istUeberfaellig(todo)
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-panel px-4 py-2.5">
      <input
        type="checkbox"
        checked={todo.erledigt}
        onChange={(e) => void onErledigt(todo.id, e.target.checked)}
        aria-label={todo.erledigt ? 'Als offen markieren' : 'Als erledigt markieren'}
        className="size-4 shrink-0 accent-gold"
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${todo.erledigt ? 'text-muted line-through' : 'text-text'}`}>
          {todo.titel}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          {todo.faellig_am && (
            <span className={`num text-xs ${ueberfaellig ? 'font-bold text-red-400' : 'text-muted'}`}>
              {datumKurz(todo.faellig_am)}
            </span>
          )}
          {todo.quelle !== 'selbst' && (
            <span className="num text-xs text-muted">· {TODO_QUELLE_LABEL[todo.quelle]}</span>
          )}
          {ueberfaellig && <span className="num text-xs font-bold text-red-400">überfällig</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void onLoeschen(todo.id)}
        aria-label="To-do löschen"
        className="shrink-0 text-xs text-muted hover:text-red-400"
      >
        ✕
      </button>
    </div>
  )
}
