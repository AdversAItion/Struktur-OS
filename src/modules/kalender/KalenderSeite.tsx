import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/modules/auth/kontext'
import { termineLaden, todosLaden } from './api'
import { TermineBereich } from './TermineBereich'
import { TodoBereich } from './TodoBereich'
import type { Termin, Todo } from './types'

/**
 * `/kalender` — eigene Termine und To-dos. Für alle Rollen offen (kein
 * min_role): jeder verwaltet seinen eigenen Kalender, siehe api.ts.
 */
export function KalenderSeite() {
  const { partner } = useAuth()
  const [termine, setTermine] = useState<Termin[] | null>(null)
  const [todos, setTodos] = useState<Todo[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  const laden = useCallback(async () => {
    if (!partner) return
    setFehler(null)
    try {
      const [t, d] = await Promise.all([termineLaden(partner.id), todosLaden(partner.id)])
      setTermine(t)
      setTodos(d)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Laden fehlgeschlagen.')
    }
  }, [partner])

  useEffect(() => {
    void laden()
  }, [laden])

  if (!partner) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="num text-sm text-muted">Lädt ...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl leading-tight font-extrabold">Kalender</h1>
      <p className="mt-2 text-sm text-muted">Deine Termine und offenen To-dos.</p>

      {fehler && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {fehler}
        </p>
      )}

      {termine === null || todos === null ? (
        <p className="num mt-4 text-sm text-muted">Lädt ...</p>
      ) : (
        <div className="mt-5 flex flex-col gap-2">
          <TermineBereich partnerId={partner.id} termine={termine} onGeaendert={laden} />
          <TodoBereich partnerId={partner.id} todos={todos} onGeaendert={laden} />
        </div>
      )}
    </div>
  )
}
