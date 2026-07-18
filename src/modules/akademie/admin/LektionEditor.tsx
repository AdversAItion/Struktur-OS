import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  lektionAktualisieren,
  lektionLaden,
  testAktualisieren,
  testAnlegen,
  testLoeschen,
  testsLaden,
} from '../api'
import { MarkdownInhalt } from '../MarkdownInhalt'
import type { AkademieLektion, AkademieTest, LektionEingabe, TestEingabe } from '../types'
import { zuYoutubeEmbed } from '../youtube'
import { Feld, Fehlerzeile, MiniButton } from './felder'

export function LektionEditor() {
  const { lektionId } = useParams<{ lektionId: string }>()
  const [lektion, setLektion] = useState<AkademieLektion | null | undefined>(undefined)
  const [tests, setTests] = useState<AkademieTest[]>([])
  const [fehler, setFehler] = useState<string | null>(null)

  const laden = useCallback(() => {
    if (!lektionId) return Promise.resolve()
    setFehler(null)
    return lektionLaden(lektionId)
      .then(async (l) => {
        setLektion(l)
        if (l) setTests(await testsLaden(l.id))
      })
      .catch((e: unknown) => setFehler(e instanceof Error ? e.message : 'Laden fehlgeschlagen.'))
  }, [lektionId])

  useEffect(() => {
    void laden()
  }, [laden])

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
        <Link to="/akademie/verwaltung" className="text-sm text-muted hover:text-text">
          ← Verwaltung
        </Link>
        <p className="mt-4 text-sm text-muted">Lektion nicht gefunden.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to={`/akademie/verwaltung/modul/${lektion.modul_id}`}
        className="text-sm text-muted hover:text-text"
      >
        ← Zurück zum Modul
      </Link>
      <h1 className="mt-3 font-display text-2xl leading-tight font-extrabold md:text-3xl">
        {lektion.titel}
      </h1>

      <div className="mt-4">
        <Fehlerzeile>{fehler}</Fehlerzeile>
      </div>

      <LektionStammdaten lektion={lektion} onGespeichert={laden} />

      <div className="mt-8">
        <p className="num text-xs tracking-widest text-gold uppercase">
          Verständnis-Check ({tests.length})
        </p>
        <p className="mt-1 text-xs text-muted">
          Alle Fragen müssen richtig sein, damit die Lektion als bestanden zählt.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {tests.map((test) => (
            <TestKarte key={test.id} test={test} onAenderung={laden} />
          ))}
        </div>
        <NeuerTest lektionId={lektion.id} onGespeichert={laden} />
      </div>
    </div>
  )
}

function LektionStammdaten({
  lektion,
  onGespeichert,
}: {
  lektion: AkademieLektion
  onGespeichert: () => Promise<void>
}) {
  const [titel, setTitel] = useState(lektion.titel)
  const [videoUrl, setVideoUrl] = useState(lektion.video_url ?? '')
  const [markdown, setMarkdown] = useState(lektion.inhalt_markdown ?? '')
  const [vorschau, setVorschau] = useState(false)
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [gespeichert, setGespeichert] = useState(false)

  const videoErkannt = videoUrl.trim() ? zuYoutubeEmbed(videoUrl.trim()) !== null : null

  async function speichern() {
    if (!titel.trim()) {
      setFehler('Titel darf nicht leer sein.')
      return
    }
    setSpeichert(true)
    setFehler(null)
    setGespeichert(false)
    const eingabe: LektionEingabe = {
      titel: titel.trim(),
      video_url: videoUrl.trim() || null,
      inhalt_markdown: markdown.trim() || null,
    }
    try {
      await lektionAktualisieren(lektion.id, eingabe)
      await onGespeichert()
      setGespeichert(true)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5">
      <p className="num text-xs tracking-widest text-muted uppercase">Inhalt</p>
      <Feld label="Titel" wert={titel} setzen={setTitel} />

      <div>
        <Feld
          label="YouTube-Link (optional)"
          wert={videoUrl}
          setzen={setVideoUrl}
          platzhalter="https://youtu.be/…"
        />
        {videoErkannt === false && (
          <p className="mt-1.5 text-xs text-red-400">
            Kein YouTube-Link erkannt — der Player zeigt dann kein Video.
          </p>
        )}
        {videoErkannt === true && (
          <p className="num mt-1.5 text-xs text-gold">Video erkannt.</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="num text-xs tracking-wider text-muted uppercase">Inhalt (Markdown)</span>
          <button
            type="button"
            onClick={() => setVorschau((v) => !v)}
            className="text-xs text-muted underline underline-offset-4 hover:text-text"
          >
            {vorschau ? 'Bearbeiten' : 'Vorschau'}
          </button>
        </div>
        {vorschau ? (
          <div className="mt-1.5 min-h-24 rounded-lg border border-line bg-bg p-4">
            {markdown.trim() ? (
              <MarkdownInhalt markdown={markdown} />
            ) : (
              <p className="text-sm text-muted">Noch kein Inhalt.</p>
            )}
          </div>
        ) : (
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={8}
            placeholder="# Überschrift&#10;&#10;Text mit **fett**, Listen usw."
            className="mt-1.5 w-full resize-y rounded-lg border border-line bg-panel px-3 py-2.5 font-mono text-sm leading-relaxed text-text placeholder:text-muted focus:border-gold focus:outline-none"
          />
        )}
      </div>

      <Fehlerzeile>{fehler}</Fehlerzeile>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void speichern()}
          disabled={speichert}
          className="rounded-lg bg-gold px-4 py-2.5 font-display text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {speichert ? 'Speichert ...' : 'Speichern'}
        </button>
        {gespeichert && <span className="num text-xs text-gold">Gespeichert.</span>}
      </div>
    </div>
  )
}

function TestKarte({ test, onAenderung }: { test: AkademieTest; onAenderung: () => Promise<void> }) {
  const [bearbeiten, setBearbeiten] = useState(false)

  async function entfernen() {
    if (!confirm('Diese Frage löschen?')) return
    await testLoeschen(test.id)
    await onAenderung()
  }

  if (bearbeiten) {
    return (
      <TestForm
        start={{ frage: test.frage, antworten: test.antworten, richtige_antwort: test.richtige_antwort }}
        onAbbrechen={() => setBearbeiten(false)}
        onSpeichern={async (eingabe) => {
          await testAktualisieren(test.id, eingabe)
          setBearbeiten(false)
          await onAenderung()
        }}
      />
    )
  }

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <p className="font-display font-bold text-text">{test.frage}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {test.antworten.map((a, i) => (
          <li
            key={i}
            className={`text-sm ${i === test.richtige_antwort ? 'text-gold' : 'text-muted'}`}
          >
            {i === test.richtige_antwort ? '✓ ' : '· '}
            {a}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <MiniButton onClick={() => setBearbeiten(true)} titel="Bearbeiten">
          Bearbeiten
        </MiniButton>
        <MiniButton onClick={() => void entfernen()} gefahr titel="Löschen">
          Löschen
        </MiniButton>
      </div>
    </div>
  )
}

function NeuerTest({
  lektionId,
  onGespeichert,
}: {
  lektionId: string
  onGespeichert: () => Promise<void>
}) {
  const [offen, setOffen] = useState(false)

  if (!offen) {
    return (
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="mt-3 w-full rounded-lg border border-line px-4 py-3 font-display text-sm font-bold text-text transition-colors hover:border-gold"
      >
        + Frage hinzufügen
      </button>
    )
  }

  return (
    <div className="mt-3">
      <TestForm
        start={{ frage: '', antworten: ['', ''], richtige_antwort: 0 }}
        onAbbrechen={() => setOffen(false)}
        onSpeichern={async (eingabe) => {
          await testAnlegen(lektionId, eingabe)
          setOffen(false)
          await onGespeichert()
        }}
      />
    </div>
  )
}

/**
 * Formular für eine Frage. Erzwingt clientseitig, was die DB-CHECKs verlangen
 * (0003): mindestens zwei nicht-leere Antworten und eine gültige richtige
 * Antwort — sonst gäbe es sonst nur eine kryptische Postgres-Fehlermeldung.
 */
function TestForm({
  start,
  onSpeichern,
  onAbbrechen,
}: {
  start: TestEingabe
  onSpeichern: (eingabe: TestEingabe) => Promise<void>
  onAbbrechen: () => void
}) {
  const [frage, setFrage] = useState(start.frage)
  const [antworten, setAntworten] = useState<string[]>(start.antworten)
  const [richtige, setRichtige] = useState(start.richtige_antwort)
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  function antwortSetzen(i: number, wert: string) {
    setAntworten((a) => a.map((x, j) => (j === i ? wert : x)))
  }
  function antwortHinzufuegen() {
    setAntworten((a) => [...a, ''])
  }
  function antwortEntfernen(i: number) {
    setAntworten((a) => a.filter((_, j) => j !== i))
    // Wenn die gelöschte oder eine davorliegende Antwort die richtige war,
    // Index nachziehen, damit er nicht ins Leere zeigt.
    setRichtige((r) => (i < r ? r - 1 : i === r ? 0 : r))
  }

  async function speichern() {
    const sauber = antworten.map((a) => a.trim())
    if (!frage.trim()) return setFehler('Die Frage darf nicht leer sein.')
    if (sauber.length < 2) return setFehler('Mindestens zwei Antworten nötig.')
    if (sauber.some((a) => a === '')) return setFehler('Keine Antwort darf leer sein.')
    if (richtige < 0 || richtige >= sauber.length) return setFehler('Bitte die richtige Antwort markieren.')

    setSpeichert(true)
    setFehler(null)
    try {
      await onSpeichern({ frage: frage.trim(), antworten: sauber, richtige_antwort: richtige })
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
      setSpeichert(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gold/40 bg-panel p-4">
      <Feld label="Frage" wert={frage} setzen={setFrage} platzhalter="z. B. Was ist wichtig?" />

      <div>
        <span className="num text-xs tracking-wider text-muted uppercase">
          Antworten — richtige markieren
        </span>
        <div className="mt-2 flex flex-col gap-2">
          {antworten.map((antwort, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="richtige-antwort"
                checked={richtige === i}
                onChange={() => setRichtige(i)}
                className="size-4 shrink-0 accent-[#D4AF37]"
                aria-label={`Antwort ${i + 1} ist richtig`}
              />
              <input
                type="text"
                value={antwort}
                onChange={(e) => antwortSetzen(i, e.target.value)}
                placeholder={`Antwort ${i + 1}`}
                className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-text placeholder:text-muted focus:border-gold focus:outline-none"
              />
              <MiniButton
                onClick={() => antwortEntfernen(i)}
                disabled={antworten.length <= 2}
                gefahr
                titel="Antwort entfernen"
              >
                ✕
              </MiniButton>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={antwortHinzufuegen}
          className="mt-2 text-xs text-muted underline underline-offset-4 hover:text-text"
        >
          + Antwort
        </button>
      </div>

      <Fehlerzeile>{fehler}</Fehlerzeile>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void speichern()}
          disabled={speichert}
          className="rounded-lg bg-gold px-4 py-2.5 font-display text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {speichert ? 'Speichert ...' : 'Speichern'}
        </button>
        <button
          type="button"
          onClick={onAbbrechen}
          className="rounded-lg border border-line px-4 py-2.5 text-sm text-muted hover:text-text"
        >
          Abbrechen
        </button>
      </div>
    </div>
  )
}
