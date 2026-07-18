import { useState, type FormEvent } from 'react'
import { anmelden } from './api'
import { useAuth } from './kontext'

/**
 * Reine Anmeldung. Es gibt bewusst keine Registrierung: Accounts legt der
 * Master per Einladung an (siehe api.ts).
 */
export function LoginSeite() {
  const { neuLaden } = useAuth()
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function absenden(e: FormEvent) {
    e.preventDefault()
    setFehler(null)
    setLaeuft(true)
    try {
      await anmelden(email, passwort)
      await neuLaden()
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Unbekannter Fehler.')
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="num text-xs tracking-widest text-gold uppercase">
            Struktur OS
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight font-extrabold">
            Anmelden
          </h1>
        </div>

        <form onSubmit={absenden} className="flex flex-col gap-4">
          <Feld
            label="E-Mail"
            typ="email"
            wert={email}
            setzen={setEmail}
            autoComplete="email"
            pflicht
          />
          <Feld
            label="Passwort"
            typ="password"
            wert={passwort}
            setzen={setPasswort}
            autoComplete="current-password"
            pflicht
          />

          {fehler && (
            <p role="alert" className="text-sm text-red-400">
              {fehler}
            </p>
          )}

          <button
            type="submit"
            disabled={laeuft}
            className="mt-2 rounded-lg bg-gold px-4 py-3 font-display font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {laeuft ? 'Moment ...' : 'Anmelden'}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          Zugang gibt es nur auf Einladung. Kein Login? Melde dich bei deiner
          Führungskraft.
        </p>
      </div>
    </main>
  )
}

function Feld({
  label,
  wert,
  setzen,
  typ = 'text',
  autoComplete,
  pflicht = false,
}: {
  label: string
  wert: string
  setzen: (w: string) => void
  typ?: string
  autoComplete?: string
  pflicht?: boolean
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="num text-xs tracking-wider text-muted uppercase">
        {label}
      </span>
      <input
        type={typ}
        value={wert}
        onChange={(e) => setzen(e.target.value)}
        required={pflicht}
        autoComplete={autoComplete}
        className="rounded-lg border border-line bg-panel px-3 py-3 text-text placeholder:text-muted focus:border-gold focus:outline-none"
      />
    </label>
  )
}
