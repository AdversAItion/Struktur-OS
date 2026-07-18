import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/modules/auth/AuthProvider'
import { Geschuetzt } from '@/modules/auth/Geschuetzt'
import { AppShell } from '@/components/AppShell'
import { StartWeiterleitung } from '@/seiten/StartWeiterleitung'

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
const DashboardSeite = lazy(() =>
  import('@/modules/dashboard/DashboardSeite').then((m) => ({ default: m.DashboardSeite })),
)
const PartnerDetail = lazy(() =>
  import('@/modules/dashboard/PartnerDetail').then((m) => ({ default: m.PartnerDetail })),
)
const VerwaltungModulListe = lazy(() =>
  import('@/modules/akademie/admin/VerwaltungModulListe').then((m) => ({
    default: m.VerwaltungModulListe,
  })),
)
const ModulEditor = lazy(() =>
  import('@/modules/akademie/admin/ModulEditor').then((m) => ({ default: m.ModulEditor })),
)
const LektionEditor = lazy(() =>
  import('@/modules/akademie/admin/LektionEditor').then((m) => ({ default: m.LektionEditor })),
)
const KalenderSeite = lazy(() =>
  import('@/modules/kalender/KalenderSeite').then((m) => ({ default: m.KalenderSeite })),
)
const NamenslisteSeite = lazy(() =>
  import('@/modules/namensliste/NamenslisteSeite').then((m) => ({ default: m.NamenslisteSeite })),
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
                  <DashboardSeite />
                </Geschuetzt>
              }
            />
            <Route
              path="/dashboard/partner/:partnerId"
              element={
                <Geschuetzt min_role="fuehrungskraft">
                  <PartnerDetail />
                </Geschuetzt>
              }
            />
            <Route path="/akademie" element={<ModulListe />} />
            <Route path="/akademie/modul/:modulId" element={<LektionListe />} />
            <Route path="/akademie/lektion/:lektionId" element={<LektionSeite />} />
            {/* Verwaltung — nur master (Route-Gating; die RLS sperrt verbindlich). */}
            <Route
              path="/akademie/verwaltung"
              element={
                <Geschuetzt min_role="master">
                  <VerwaltungModulListe />
                </Geschuetzt>
              }
            />
            <Route
              path="/akademie/verwaltung/modul/:modulId"
              element={
                <Geschuetzt min_role="master">
                  <ModulEditor />
                </Geschuetzt>
              }
            />
            <Route
              path="/akademie/verwaltung/lektion/:lektionId"
              element={
                <Geschuetzt min_role="master">
                  <LektionEditor />
                </Geschuetzt>
              }
            />
            <Route path="/kalender" element={<KalenderSeite />} />
            <Route path="/namensliste" element={<NamenslisteSeite />} />
            {/* Unbekannter Pfad -> zurück auf den rollengerechten Einstieg. */}
            <Route path="*" element={<StartWeiterleitung />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
