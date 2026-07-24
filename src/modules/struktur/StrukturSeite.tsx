import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/modules/auth/kontext'
import {
  KARRIERESTUFE_LABEL,
  ROLLEN_LABEL,
  type Karrierestufe,
  type Partner,
} from '@/modules/auth/types'
import { aktivSetzen, meineStrukturLaden, stufeSetzen } from './api'

/**
 * Struktur-Verwaltung ab Stufe 3 (Audit). Ein Leiter sieht hier seine gesamte
 * Downline und kann jeden Partner hochstufen (bis zur eigenen Stufe) und
 * aktiv/inaktiv schalten. Die verbindliche Sperre ist die RLS (0010) — das UI
 * begrenzt nur die Auswahl. Route-Gating: min_stufe 3 (App.tsx).
 */
export function StrukturSeite() {
  const { partner: ich, darf } = useAuth()
  const istMaster = darf('master')
  // Bis zu welcher Stufe darf hochgestuft werden: master bis 6, sonst die
  // eigene Stufe (deckungsgleich mit dem Deckel in der RLS-Policy).
  const maxStufe: Karrierestufe = istMaster ? 6 : ((ich?.stufe ?? 1) as Karrierestufe)

  const [struktur, setStruktur] = useState<Partner[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  const laden = useCallback(() => {
    if (!ich) return Promise.resolve()
    setFehler(null)
    return meineStrukturLaden(ich.id)
      .then(setStruktur)
      .catch((e: unknown) => setFehler(e instanceof Error ? e.message : 'Laden fehlgeschlagen.'))
  }, [ich])

  useEffect(() => {
    void laden()
  }, [laden])

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl leading-tight font-extrabold md:text-3xl">Struktur</h1>
      <p className="mt-2 text-sm text-muted">
        Deine Downline — hochstufen bis Stufe {maxStufe} und aktiv/inaktiv schalten.
      </p>

      <div className="mt-4">
        {fehler && (
          <p role="alert" className="text-sm text-red-400">
            {fehler}
          </p>
        )}
      </div>

      {struktur === null && !fehler && (
        <p className="num mt-4 text-sm text-muted">Lädt ...</p>
      )}

      {struktur !== null && struktur.length === 0 && (
        <p className="mt-4 text-sm text-muted">
          Noch niemand in deiner Struktur. Sobald du Partner gewinnst, erscheinen sie hier.
        </p>
      )}

      {struktur !== null && struktur.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {struktur.map((p) => (
            <PartnerZeile
              key={p.id}
              partner={p}
              maxStufe={maxStufe}
              onFehler={setFehler}
              onGeaendert={laden}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PartnerZeile({
  partner,
  maxStufe,
  onFehler,
  onGeaendert,
}: {
  partner: Partner
  maxStufe: Karrierestufe
  onFehler: (f: string | null) => void
  onGeaendert: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  async function stufeAendern(neu: Karrierestufe) {
    if (neu === partner.stufe) return
    setBusy(true)
    onFehler(null)
    try {
      await stufeSetzen(partner.id, neu)
      await onGeaendert()
    } catch (e) {
      onFehler(e instanceof Error ? e.message : 'Stufe ändern fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  async function aktivUmschalten() {
    const neu = !partner.aktiv
    if (neu === false && !confirm(`„${partner.name || 'Partner'}" wirklich inaktiv setzen?`)) return
    setBusy(true)
    onFehler(null)
    try {
      await aktivSetzen(partner.id, neu)
      await onGeaendert()
    } catch (e) {
      onFehler(e instanceof Error ? e.message : 'Status ändern fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  // Auswahl bis maxStufe; eine bereits höhere Ist-Stufe (z. B. vom master
  // gesetzt) bleibt sichtbar, damit der Wert nicht stillschweigend springt.
  const obergrenze = Math.max(maxStufe, partner.stufe)
  const stufen = Array.from({ length: obergrenze }, (_, i) => (i + 1) as Karrierestufe)

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-panel p-3 ${
        partner.aktiv ? '' : 'opacity-60'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-display font-bold text-text">
          {partner.name || 'Ohne Namen'}
        </p>
        <p className="num mt-0.5 text-xs text-muted">
          {ROLLEN_LABEL[partner.rolle]}
          {partner.aktiv ? '' : ' · inaktiv'}
        </p>
      </div>

      <label className="flex items-center gap-2">
        <span className="num text-[10px] tracking-wider text-muted uppercase">Stufe</span>
        <select
          value={partner.stufe}
          disabled={busy}
          onChange={(e) => void stufeAendern(Number(e.target.value) as Karrierestufe)}
          aria-label={`Stufe von ${partner.name || 'Partner'}`}
          className="rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-text focus:border-gold focus:outline-none disabled:opacity-50"
        >
          {stufen.map((s) => (
            <option key={s} value={s} disabled={s > maxStufe}>
              {s} · {KARRIERESTUFE_LABEL[s]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => void aktivUmschalten()}
        disabled={busy}
        className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
          partner.aktiv
            ? 'border-line text-muted hover:border-red-400 hover:text-red-400'
            : 'border-gold text-gold hover:opacity-90'
        }`}
      >
        {partner.aktiv ? 'Inaktiv setzen' : 'Aktivieren'}
      </button>
    </div>
  )
}
