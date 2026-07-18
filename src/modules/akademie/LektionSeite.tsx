import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/modules/auth/kontext'
import {
  eigenenFortschrittLaden,
  lektionAbschliessen,
  lektionenMitFortschrittLaden,
  lektionLaden,
  testsLaden,
} from './api'
import { MarkdownInhalt } from './MarkdownInhalt'
import type { AkademieFortschritt, AkademieLektion, AkademieTest, LektionMitFortschritt } from './types'
import { zuYoutubeEmbed } from './youtube'

export function LektionSeite() {
  const { lektionId } = useParams<{ lektionId: string }>()
  const { partner } = useAuth()

  const [lektion, setLektion] = useState<AkademieLektion | null | undefined>(undefined)
  const [tests, setTests] = useState<AkademieTest[]>([])
  const [fortschritt, setFortschritt] = useState<AkademieFortschritt | null>(null)
  const [geschwister, setGeschwister] = useState<LektionMitFortschritt[]>([])
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    if (!partner || !lektionId) return
    let abgebrochen = false

    lektionLaden(lektionId)
      .then(async (l) => {
        if (abgebrochen) return
        setLektion(l)
        if (!l) return
        const [t, f, g] = await Promise.all([
          testsLaden(l.id),
          eigenenFortschrittLaden(l.id, partner.id),
          lektionenMitFortschrittLaden(l.modul_id, partner.id),
        ])
        if (abgebrochen) return
        setTests(t)
        setFortschritt(f)
        setGeschwister(g)
      })
      .catch((err: unknown) => {
        if (!abgebrochen) {
          setFehler(err instanceof Error ? err.message : 'Lektion konnte nicht geladen werden.')
        }
      })

    return () => {
      abgebrochen = true
    }
  }, [lektionId, partner])

  if (!partner) return null

  if (fehler) {
    return (
      <div className="mx-auto max-w-2xl">
        <p role="alert" className="text-sm text-red-400">
          {fehler}
        </p>
      </div>
    )
  }

  if (lektion === undefined) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="num text-sm text-muted">Lädt ...</p>
      </div>
    )
  }

  if (lektion === null) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link to="/akademie" className="text-sm text-muted hover:text-text">
          ← Akademie
        </Link>
        <p className="mt-4 text-sm text-muted">
          Lektion nicht gefunden oder noch nicht freigeschaltet.
        </p>
      </div>
    )
  }

  const embedUrl = lektion.video_url ? zuYoutubeEmbed(lektion.video_url) : null
  const abgeschlossen = fortschritt?.abgeschlossen_am != null

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/akademie/modul/${lektion.modul_id}`} className="text-sm text-muted hover:text-text">
        ← Zurück zum Modul
      </Link>

      <h1 className="mt-3 font-display text-2xl leading-tight font-extrabold md:text-3xl">
        {lektion.titel}
      </h1>

      {abgeschlossen && fortschritt && (
        <p className="num mt-3 inline-block rounded-full bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
          Abgeschlossen am {formatiereDatum(fortschritt.abgeschlossen_am!)}
        </p>
      )}

      {embedUrl && (
        <div className="mt-5 aspect-video overflow-hidden rounded-xl border border-line bg-bg">
          <iframe
            src={embedUrl}
            title={lektion.titel}
            className="size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {lektion.inhalt_markdown && (
        <div className="mt-5 rounded-xl border border-line bg-panel p-5">
          <MarkdownInhalt markdown={lektion.inhalt_markdown} />
        </div>
      )}

      {!abgeschlossen && tests.length === 0 && (
        <AbschliessenButton lektion={lektion} partnerId={partner.id} onFertig={setFortschritt} />
      )}

      {!abgeschlossen && tests.length > 0 && (
        <MiniTest
          lektion={lektion}
          tests={tests}
          partnerId={partner.id}
          onBestanden={setFortschritt}
        />
      )}

      {abgeschlossen && <NaechsteLektion geschwister={geschwister} aktuelleId={lektion.id} />}
    </div>
  )
}

function AbschliessenButton({
  lektion,
  partnerId,
  onFertig,
}: {
  lektion: AkademieLektion
  partnerId: string
  onFertig: (f: AkademieFortschritt) => void
}) {
  const [speichertGerade, setSpeichertGerade] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function abschliessen() {
    setSpeichertGerade(true)
    setFehler(null)
    try {
      await lektionAbschliessen(lektion.id, partnerId, true)
      onFertig({
        id: '',
        partner_id: partnerId,
        lektion_id: lektion.id,
        abgeschlossen_am: new Date().toISOString(),
        test_bestanden: true,
        created_at: new Date().toISOString(),
      })
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Konnte nicht gespeichert werden.')
    } finally {
      setSpeichertGerade(false)
    }
  }

  return (
    <div className="mt-6">
      {fehler && (
        <p role="alert" className="mb-3 text-sm text-red-400">
          {fehler}
        </p>
      )}
      <button
        type="button"
        onClick={() => void abschliessen()}
        disabled={speichertGerade}
        className="w-full rounded-lg bg-gold px-4 py-3 font-display font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {speichertGerade ? 'Moment ...' : 'Als abgeschlossen markieren'}
      </button>
    </div>
  )
}

function MiniTest({
  lektion,
  tests,
  partnerId,
  onBestanden,
}: {
  lektion: AkademieLektion
  tests: AkademieTest[]
  partnerId: string
  onBestanden: (f: AkademieFortschritt) => void
}) {
  const [ausgewaehlt, setAusgewaehlt] = useState<Record<string, number>>({})
  const [ausgewertet, setAusgewertet] = useState(false)
  const [speichertGerade, setSpeichertGerade] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const alleBeantwortet = tests.every((t) => ausgewaehlt[t.id] !== undefined)
  const alleRichtig = ausgewertet && tests.every((t) => ausgewaehlt[t.id] === t.richtige_antwort)

  async function auswerten() {
    setAusgewertet(true)
    const bestanden = tests.every((t) => ausgewaehlt[t.id] === t.richtige_antwort)
    if (!bestanden) return

    setSpeichertGerade(true)
    setFehler(null)
    try {
      await lektionAbschliessen(lektion.id, partnerId, true)
      onBestanden({
        id: '',
        partner_id: partnerId,
        lektion_id: lektion.id,
        abgeschlossen_am: new Date().toISOString(),
        test_bestanden: true,
        created_at: new Date().toISOString(),
      })
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Konnte nicht gespeichert werden.')
    } finally {
      setSpeichertGerade(false)
    }
  }

  function nochmalVersuchen() {
    setAusgewaehlt({})
    setAusgewertet(false)
  }

  return (
    <div className="mt-6 rounded-xl border border-line bg-panel p-5">
      <p className="num text-xs tracking-widest text-gold uppercase">Verständnis-Check</p>

      <div className="mt-4 flex flex-col gap-6">
        {tests.map((test) => (
          <div key={test.id}>
            <p className="font-display font-bold text-text">{test.frage}</p>
            <div className="mt-3 flex flex-col gap-2">
              {test.antworten.map((antwort, i) => {
                const gewaehlt = ausgewaehlt[test.id] === i
                const richtig = i === test.richtige_antwort
                let stil = 'border-line hover:border-gold'
                if (ausgewertet && gewaehlt && richtig) stil = 'border-gold bg-gold/10'
                else if (ausgewertet && gewaehlt && !richtig) stil = 'border-red-400 bg-red-400/10'
                else if (gewaehlt) stil = 'border-gold'

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={ausgewertet}
                    onClick={() => setAusgewaehlt((a) => ({ ...a, [test.id]: i }))}
                    className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default ${stil}`}
                  >
                    {antwort}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {fehler && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {fehler}
        </p>
      )}

      {!ausgewertet && (
        <button
          type="button"
          onClick={() => void auswerten()}
          disabled={!alleBeantwortet}
          className="mt-5 w-full rounded-lg bg-gold px-4 py-3 font-display font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Auswerten
        </button>
      )}

      {ausgewertet && !alleRichtig && (
        <div className="mt-5">
          <p className="text-sm text-muted">
            Noch nicht ganz — schau dir die rot markierten Antworten nochmal an.
          </p>
          <button
            type="button"
            onClick={nochmalVersuchen}
            className="mt-3 w-full rounded-lg border border-line px-4 py-3 font-display font-bold text-text transition-colors hover:border-gold"
          >
            Nochmal versuchen
          </button>
        </div>
      )}

      {ausgewertet && alleRichtig && (
        <p className="num mt-5 text-sm font-bold text-gold">
          {speichertGerade ? 'Speichert ...' : 'Bestanden — Lektion abgeschlossen.'}
        </p>
      )}
    </div>
  )
}

function NaechsteLektion({
  geschwister,
  aktuelleId,
}: {
  geschwister: LektionMitFortschritt[]
  aktuelleId: string
}) {
  const index = geschwister.findIndex((l) => l.id === aktuelleId)
  const naechste = index >= 0 ? geschwister[index + 1] : undefined

  return (
    <div className="mt-6">
      {naechste ? (
        <Link
          to={`/akademie/lektion/${naechste.id}`}
          className="block w-full rounded-lg bg-gold px-4 py-3 text-center font-display font-bold text-bg transition-opacity hover:opacity-90"
        >
          Weiter: {naechste.titel} →
        </Link>
      ) : (
        // Letzte Lektion des Moduls: zur Modul-Übersicht (/akademie), nicht zurück
        // zur Lektionsliste desselben Moduls — dort steht dann eh nur "Fertig".
        <Link
          to="/akademie"
          className="block w-full rounded-lg border border-line px-4 py-3 text-center font-display font-bold text-text transition-colors hover:border-gold"
        >
          Modul abgeschlossen — zurück zur Übersicht
        </Link>
      )}
    </div>
  )
}

function formatiereDatum(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(iso))
}
