import { Component, type ReactNode } from 'react'

/**
 * Statischer Ersatz für die 3D-Szene: dezenter Gold-Schimmer auf Schwarz.
 * Wird gezeigt, während Three.js lädt (Suspense) und wenn WebGL nicht
 * verfügbar ist (ErrorBoundary) — die Seite bleibt also immer ansehnlich.
 */
export function HeroFallback() {
  return (
    <div
      className="size-full"
      style={{
        background:
          'radial-gradient(circle at 50% 45%, rgba(212,175,55,0.22), rgba(212,175,55,0.04) 45%, transparent 70%)',
      }}
      aria-hidden="true"
    />
  )
}

/** Fängt WebGL-/Render-Fehler der 3D-Szene ab und zeigt den statischen Ersatz. */
export class SzeneGrenze extends Component<{ children: ReactNode }, { fehler: boolean }> {
  state = { fehler: false }

  static getDerivedStateFromError() {
    return { fehler: true }
  }

  render() {
    if (this.state.fehler) return <HeroFallback />
    return this.props.children
  }
}
