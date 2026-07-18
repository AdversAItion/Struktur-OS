import { Suspense, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/modules/auth/kontext'
import { ROLLEN_LABEL, type Rolle } from '@/modules/auth/types'

/**
 * Layout der App: Seitennavigation ab `md`, Bottom-Bar auf dem Handy
 * (90 % der Nutzung läuft mobil, siehe CLAUDE.md).
 *
 * `min_role` blendet Nav-Punkte aus, für die die Rolle nicht reicht. Das ist
 * reine Kosmetik — die verbindliche Sperre sind die RLS-Policies und der
 * Geschuetzt-Guard auf der Route.
 */
interface NavPunkt {
  pfad: string
  label: string
  min_role: Rolle
  icon: ReactNode
}

const NAV: NavPunkt[] = [
  {
    pfad: '/dashboard',
    label: 'Dashboard',
    min_role: 'fuehrungskraft',
    icon: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </>
    ),
  },
  {
    pfad: '/akademie',
    label: 'Akademie',
    min_role: 'gp_frisch',
    icon: (
      <>
        <path d="M12 4 2 9l10 5 10-5-10-5Z" />
        <path d="M6 11.5V17c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5.5" />
      </>
    ),
  },
  {
    pfad: '/kalender',
    label: 'Kalender',
    min_role: 'gp_frisch',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    pfad: '/namensliste',
    label: 'Namensliste',
    min_role: 'gp_frisch',
    icon: (
      <>
        <path d="M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6M22 11h-6" />
      </>
    ),
  },
]

export function AppShell() {
  const { partner, darf, abmelden } = useAuth()
  if (!partner) return null

  const sichtbar = NAV.filter((p) => darf(p.min_role))

  return (
    <div className="min-h-svh md:flex">
      {/* Seitennavigation ab md */}
      <aside className="hidden w-56 shrink-0 border-r border-line md:flex md:flex-col">
        <div className="px-5 py-5">
          <p className="num text-xs tracking-widest text-gold uppercase">
            Struktur OS
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {sichtbar.map((p) => (
            <NavLink
              key={p.pfad}
              to={p.pfad}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-panel font-bold text-gold'
                    : 'text-muted hover:bg-panel hover:text-text',
                ].join(' ')
              }
            >
              <Icon>{p.icon}</Icon>
              {p.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line px-5 py-4">
          <p className="truncate text-sm font-bold">{partner.name || 'Partner'}</p>
          <p className="num mt-0.5 text-xs text-muted">
            {ROLLEN_LABEL[partner.rolle]}
          </p>
          <button
            type="button"
            onClick={() => void abmelden()}
            className="mt-3 text-sm text-muted underline underline-offset-4 hover:text-text"
          >
            Abmelden
          </button>
        </div>
      </aside>

      {/* Kopfzeile nur mobil — die Seitenleiste trägt das auf Desktop schon. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line px-5 py-4 md:hidden">
          <p className="num text-xs tracking-widest text-gold uppercase">
            Struktur OS
          </p>
          <button
            type="button"
            onClick={() => void abmelden()}
            className="text-sm text-muted hover:text-text"
          >
            Abmelden
          </button>
        </header>

        {/* pb-20 hält den Inhalt über der Bottom-Bar frei. */}
        <main className="flex-1 px-5 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          <Suspense fallback={<p className="num text-sm text-muted">Lädt ...</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Bottom-Bar nur mobil. pb-safe fängt die iPhone-Home-Indicator-Zone ab. */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden">
        {sichtbar.map((p) => (
          <NavLink
            key={p.pfad}
            to={p.pfad}
            className={({ isActive }) =>
              [
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors',
                isActive ? 'text-gold' : 'text-muted',
              ].join(' ')
            }
          >
            <Icon>{p.icon}</Icon>
            {p.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5 shrink-0"
    >
      {children}
    </svg>
  )
}
