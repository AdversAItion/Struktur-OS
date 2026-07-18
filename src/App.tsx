import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/modules/auth/AuthProvider'
import { Geschuetzt } from '@/modules/auth/Geschuetzt'
import { AppShell } from '@/components/AppShell'
import { StartWeiterleitung } from '@/seiten/StartWeiterleitung'
import { Dashboard } from '@/seiten/Dashboard'
import { Kalender } from '@/seiten/Kalender'
import { Namensliste } from '@/seiten/Namensliste'

// Lazy: zieht react-markdown/remark-gfm nach, das soll nicht im Hauptbundle
// landen — 90 % der Nutzung ist mobil (CLAUDE.md).
const ModulListe = lazy(() =>
  import('@/modules/akademie/ModulListe').then((m) => ({ default: m.ModulListe })),
)
const LektionListe = lazy(() =>
  import('@/modules/akademie/LektionListe').then((m) => ({ default: m.LektionListe })),
)
const LektionSeite = lazy(() =>
  import('@/modules/akademie/LektionSeite').then((m) => ({ default: m.LektionSeite })),
)

/**
 * Alles liegt hinter <Geschuetzt> — ohne Anmeldung erscheint die LoginSeite.
 * Die min_role an der Route ist UI-Gating; gesperrt wird in der RLS.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            element={
              <Geschuetzt>
                <AppShell />
              </Geschuetzt>
            }
          >
            <Route path="/" element={<StartWeiterleitung />} />
            <Route
              path="/dashboard"
              element={
                <Geschuetzt min_role="fuehrungskraft">
                  <Dashboard />
                </Geschuetzt>
              }
            />
            <Route path="/akademie" element={<ModulListe />} />
            <Route path="/akademie/modul/:modulId" element={<LektionListe />} />
            <Route path="/akademie/lektion/:lektionId" element={<LektionSeite />} />
            <Route path="/kalender" element={<Kalender />} />
            <Route path="/namensliste" element={<Namensliste />} />
            {/* Unbekannter Pfad -> zurück auf den rollengerechten Einstieg. */}
            <Route path="*" element={<StartWeiterleitung />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
