import type { ReactNode } from 'react'
import { useAuth } from './kontext'
import { ROLLEN_LABEL, type Rolle } from './types'
import { LoginSeite } from './LoginSeite'

/**
 * Route-Guard. `min_role` schaltet Inhalte pro Rolle frei — dieselbe Mechanik,
 * die später die Akademie-Module nutzen.
 *
 * Achtung: reines UI-Gating. Die verbindliche Sperre sind die RLS-Policies.
 */
export function Geschuetzt({
  children,
  min_role,
}: {
  children: ReactNode
  min_role?: Rolle
}) {
  const { laedt, angemeldet, darf } = useAuth()

  if (laedt) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="num text-sm text-muted">Lädt ...</p>
      </div>
    )
  }

  if (!angemeldet) return <LoginSeite />

  if (min_role && !darf(min_role)) {
    return (
      <div className="flex min-h-svh items-center justify-center px-5">
        <div className="max-w-sm text-center">
          <p className="num text-xs tracking-widest text-gold uppercase">
            Gesperrt
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold">
            Noch nicht freigeschaltet
          </h1>
          <p className="mt-3 text-sm text-muted">
            Dieser Bereich ist ab {ROLLEN_LABEL[min_role]} verfügbar.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
