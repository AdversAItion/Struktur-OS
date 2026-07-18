import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/modules/auth/kontext'
import { ROLLEN_LABEL } from '@/modules/auth/types'
import { monatsUebersichtLaden } from './api'
import { InsightsPanel } from './InsightsPanel'
import { aktuellerMonat, monatLabel, monatVerschieben } from './monat'
import { dezimal } from './format'
import type { PartnerUebersicht } from './types'

export function DashboardSeite() {
  const { partner } = useAuth()
  const [params, setParams] = useSearchParams()
  const monat = params.get('monat') ?? aktuellerMonat()

  const [zeilen, setZeilen] = useState<PartnerUebersicht[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    let abgebrochen = false
    setZeilen(null)
    setFehler(null)
    monatsUebersichtLaden(monat)
      .then((z) => {
        if (!abgebrochen) setZeilen(z)
      })
      .catch((e: unknown) => {
        if (!abgebrochen) setFehler(e instanceof Error ? e.message : 'Laden fehlgeschlagen.')
      })
    return () => {
      abgebrochen = true
    }
  }, [monat])

  // Eigene Zeile raus — das Dashboard zeigt das Team, nicht den Betrachter selbst.
  const team = useMemo(
    () => (zeilen ?? []).filter((z) => z.partner.id !== partner?.id),
    [zeilen, partner],
  )

  function monatWechseln(delta: number) {
    setParams({ monat: monatVerschieben(monat, delta) })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl leading-tight font-extrabold">Dashboard</h1>
      <p className="mt-2 text-sm text-muted">Wer liefert, wer hängt — Einheiten und Akademie.</p>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-line bg-panel px-3 py-2">
        <button
          type="button"
          onClick={() => monatWechseln(-1)}
          className="rounded-lg px-3 py-1.5 text-muted transition-colors hover:text-gold"
          aria-label="Vormonat"
        >
          ←
        </button>
        <span className="num text-sm font-bold text-text">{monatLabel(monat)}</span>
        <button
          type="button"
          onClick={() => monatWechseln(1)}
          className="rounded-lg px-3 py-1.5 text-muted transition-colors hover:text-gold"
          aria-label="Folgemonat"
        >
          →
        </button>
      </div>

      <InsightsPanel monat={monat} />

      {fehler && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {fehler}
        </p>
      )}

      {!fehler && zeilen === null && <p className="num mt-4 text-sm text-muted">Lädt ...</p>}

      {zeilen !== null && team.length === 0 && (
        <p className="mt-4 text-sm text-muted">Keine Partner in deiner Struktur.</p>
      )}

      {team.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {team.map((z) => (
            <PartnerZeile key={z.partner.id} zeile={z} monat={monat} />
          ))}
        </div>
      )}
    </div>
  )
}

function PartnerZeile({ zeile, monat }: { zeile: PartnerUebersicht; monat: string }) {
  const {
    partner,
    zielEinheiten,
    istEinheiten,
    zielTermine,
    istTermine,
    lektionenAbgeschlossen,
    lektionenVerfuegbar,
  } = zeile

  const hatZiel = zielEinheiten !== null && zielEinheiten > 0
  const einheitenAnteil = hatZiel ? Math.min(istEinheiten / zielEinheiten!, 1) : 0
  const haengt = hatZiel && istEinheiten === 0
  const hatZielTermine = zielTermine !== null && zielTermine > 0
  const termineAnteil = hatZielTermine ? Math.min(istTermine / zielTermine!, 1) : 0
  const akademieAnteil =
    lektionenVerfuegbar > 0 ? lektionenAbgeschlossen / lektionenVerfuegbar : 0

  return (
    <Link
      to={`/dashboard/partner/${partner.id}?monat=${monat}`}
      className="block rounded-xl border border-line bg-panel p-4 transition-colors hover:border-gold"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display font-bold text-text">
            {partner.name || 'Ohne Namen'}
          </p>
          <p className="num mt-0.5 text-xs text-muted">{ROLLEN_LABEL[partner.rolle]}</p>
        </div>
        {haengt && (
          <span className="num shrink-0 rounded-full bg-red-400/10 px-2.5 py-1 text-xs font-bold text-red-400">
            0 Einheiten
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Kennzahl
          label="Einheiten"
          anteil={einheitenAnteil}
          wert={
            hatZiel
              ? `${dezimal(istEinheiten)} / ${dezimal(zielEinheiten!)}`
              : dezimal(istEinheiten)
          }
          zusatz={hatZiel ? undefined : 'kein Ziel'}
        />
        <Kennzahl
          label="Termine"
          anteil={termineAnteil}
          wert={hatZielTermine ? `${istTermine} / ${zielTermine}` : String(istTermine)}
          zusatz={hatZielTermine ? undefined : 'kein Ziel'}
        />
        <Kennzahl
          label="Akademie"
          anteil={akademieAnteil}
          wert={
            lektionenVerfuegbar > 0
              ? `${lektionenAbgeschlossen} / ${lektionenVerfuegbar}`
              : '—'
          }
          zusatz={lektionenVerfuegbar > 0 ? undefined : 'nichts frei'}
        />
      </div>
    </Link>
  )
}

function Kennzahl({
  label,
  anteil,
  wert,
  zusatz,
}: {
  label: string
  anteil: number
  wert: string
  zusatz?: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="num text-xs tracking-wider text-muted uppercase">{label}</span>
        <span className="num text-xs text-text">{wert}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full bg-gold transition-[width]"
          style={{ width: `${Math.round(anteil * 100)}%` }}
        />
      </div>
      {zusatz && <span className="num mt-1 block text-[10px] text-muted">{zusatz}</span>}
    </div>
  )
}
