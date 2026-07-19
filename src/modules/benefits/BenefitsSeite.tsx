import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { HeroFallback, SzeneGrenze } from './HeroFallback'

// Three.js ist schwer — nur auf dieser Seite laden, nicht im Haupt-Bundle.
const Szene = lazy(() => import('./Szene').then((m) => ({ default: m.Szene })))

/**
 * Öffentliche Rekrutierungs-Seite (kein Login, keine Nav). 3D-Showpiece im
 * Schwarz/Gold-Design.
 *
 * HINWEIS: Die Texte sind ENTWURF — echte Copy (und der Kontaktweg) kommen im
 * Audit vom Vertrieb. Keine erfundenen Zahlen/Testimonials (CLAUDE.md).
 */
export function BenefitsSeite() {
  const bewegung = !usePrefersReducedMotion()

  return (
    <div className="min-h-svh bg-bg text-text">
      {/* Kopf */}
      <header className="flex items-center justify-between px-5 py-4 md:px-8">
        <p className="num text-xs tracking-widest text-gold uppercase">Struktur OS</p>
        <span className="num rounded-full border border-line px-2.5 py-1 text-[10px] tracking-wider text-muted uppercase">
          Entwurf · Texte im Audit finalisieren
        </span>
      </header>

      {/* Hero mit 3D */}
      <section className="relative flex min-h-[68svh] items-center justify-center overflow-hidden px-5">
        <div className="absolute inset-0">
          <SzeneGrenze>
            <Suspense fallback={<HeroFallback />}>
              <Szene bewegung={bewegung} />
            </Suspense>
          </SzeneGrenze>
        </div>
        {/* Verlauf für Lesbarkeit des Texts über der Szene */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />

        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl leading-[1.05] font-extrabold md:text-6xl">
            Bau dir dein <span className="text-gold">eigenes</span> Business.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm text-muted md:text-base">
            Werde Teil einer Struktur, die dich von Tag eins ausbildet — mit klarem
            Weg, starkem Team und digitalen Tools.
          </p>
          <a
            href="#kontakt"
            className="mt-8 inline-block rounded-lg bg-gold px-6 py-3 font-display font-bold text-bg transition-opacity hover:opacity-90"
          >
            Kennenlernen
          </a>
        </div>
      </section>

      {/* Benefit-Karten */}
      <section className="mx-auto max-w-4xl px-5 py-16 md:px-8">
        <h2 className="font-display text-2xl font-extrabold md:text-3xl">Warum mit uns?</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.titel} className="rounded-2xl border border-line bg-panel p-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
                <Icon>{b.icon}</Icon>
              </span>
              <p className="mt-4 font-display text-lg font-bold">{b.titel}</p>
              <p className="mt-1.5 text-sm text-muted">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Kontakt / CTA-Ziel */}
      <section id="kontakt" className="border-t border-line px-5 py-16 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-extrabold md:text-3xl">Interessiert?</h2>
          <p className="mt-3 text-sm text-muted">
            Sprich deinen Ansprechpartner an und lern uns unverbindlich kennen.
          </p>
          <p className="num mt-6 inline-block rounded-lg border border-line px-4 py-2 text-xs text-muted">
            [OFFEN: konkreten Kontaktweg im Audit eintragen]
          </p>
        </div>
        <p className="num mt-12 text-center text-[10px] tracking-widest text-muted uppercase">
          Struktur OS
        </p>
      </section>
    </div>
  )
}

interface Benefit {
  titel: string
  text: string
  icon: ReactNode
}

// Generische, wahrheitsgemäße Value-Props — KEINE erfundenen Zahlen/Testimonials.
// Final abzustimmen im Audit.
const BENEFITS: Benefit[] = [
  {
    titel: 'Eigenes Business',
    text: 'Selbstständig arbeiten und dir Schritt für Schritt etwas Eigenes aufbauen.',
    icon: <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />,
  },
  {
    titel: 'Ausbildung ab Tag 1',
    text: 'Strukturierte Onboarding-Akademie und Begleitung von Anfang an.',
    icon: (
      <>
        <path d="M12 4 2 9l10 5 10-5-10-5Z" />
        <path d="M6 11.5V17c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5.5" />
      </>
    ),
  },
  {
    titel: 'Freie Zeiteinteilung',
    text: 'Deine Termine, dein Tempo — Beruf und Leben passen zusammen.',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </>
    ),
  },
  {
    titel: 'Starkes Team',
    text: 'Eine Struktur, die zusammenhält und in der niemand allein dasteht.',
    icon: (
      <>
        <path d="M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 20v-1a4 4 0 0 0-3-3.87" />
      </>
    ),
  },
  {
    titel: 'Klarer Karriereweg',
    text: 'Nachvollziehbare Stufen — du weißt jederzeit, was der nächste Schritt ist.',
    icon: <path d="M3 17l6-6 4 4 8-8M21 7v6M21 7h-6" />,
  },
  {
    titel: 'Digitale Tools',
    text: 'Mit Struktur OS hast du Ziele, Termine und Fortschritt immer im Blick.',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M8 20h8M12 18v2" />
      </>
    ),
  },
]

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
      className="size-5"
    >
      {children}
    </svg>
  )
}

function usePrefersReducedMotion(): boolean {
  const [reduziert, setReduziert] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduziert(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduziert(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduziert
}
