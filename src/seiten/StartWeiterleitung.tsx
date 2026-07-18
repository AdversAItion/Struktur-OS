import { Navigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/kontext'

/**
 * Einstieg auf "/": schickt jeden dorthin, wo seine Arbeit anfängt.
 * Master und Führungskraft steuern -> Dashboard, GPs lernen -> Akademie.
 */
export function StartWeiterleitung() {
  const { darf } = useAuth()
  return <Navigate to={darf('fuehrungskraft') ? '/dashboard' : '/akademie'} replace />
}
