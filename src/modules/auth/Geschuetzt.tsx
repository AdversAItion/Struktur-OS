import type { ReactNode } from 'react'
import { useAuth } from './kontext'
import { KARRIERESTUFE_LABEL, ROLLEN_LABEL, type Karrierestufe, type Rolle } from './types'
import { LoginSeite } from './LoginSeite'

/**
 * Route-Guard. Schaltet Inhalte frei nach Rolle (`min_role`) und/oder
 * Karrierestufe (`min_stufe`). Beides ist reines UI-Gating — die verbindliche
 * Sperre sind die RLS-Policies (rolle_rang / meine_stufe in der DB).
 */
export function Geschuetzt({
  children,
  min_role,
  min_stufe,
}: {
  children: ReactNode
  min_role?: Rolle
  min_stufe?: Karrierestufe
}) {
  const { laedt, angemeldet, darf, darfStufe } = useAuth()

  if (laedt) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="num text-sm text-muted">Lädt ...</p>
      </div>
    )
  }

  if (!angemeldet) return <LoginSeite />

  if (min_role && !darf(min_role)) {
    return <Gesperrt grund={`ab ${ROLLEN_LABEL[min_role]}`} />
  }

  if (min_stufe && !darfStufe(min_stufe)) {
    return <Gesperrt grund={`ab Stufe ${min_stufe} (${KARRIERESTUFE_LABEL[min_stufe]})`} />
  }

  return <>{children}</>
}

function Gesperrt({ grund }: { grund: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center px-5">
      <div className="max-w-sm text-center">
        <p className="num text-xs tracking-widest text-gold uppercase">Gesperrt</p>
        <h1 className="mt-2 font-display text-2xl font-bold">Noch nicht freigeschaltet</h1>
        <p className="mt-3 text-sm text-muted">Dieser Bereich ist {grund} verfügbar.</p>
      </div>
    </div>
  )
}
