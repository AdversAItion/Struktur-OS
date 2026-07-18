import { assert, assertEquals } from 'jsr:@std/assert@1'
import {
  SYSTEM_PROMPT,
  textAusAntwort,
  verlaufIstGueltig,
  zuApiMessages,
  type ChatNachricht,
} from './logik.ts'

Deno.test('System-Prompt: eine Frage pro Nachricht, keine erfundenen Namen', () => {
  assert(SYSTEM_PROMPT.includes('nur EINE Frage'))
  assert(SYSTEM_PROMPT.includes('Erfinde NIEMALS'))
  assert(SYSTEM_PROMPT.includes('ABC') || SYSTEM_PROMPT.includes('A ='))
})

Deno.test('verlaufIstGueltig: leerer Verlauf ist ungültig', () => {
  assertEquals(verlaufIstGueltig([]), false)
})

Deno.test('verlaufIstGueltig: muss mit user beginnen', () => {
  const nurAssistant: ChatNachricht[] = [{ rolle: 'assistant', text: 'Hallo' }]
  assertEquals(verlaufIstGueltig(nurAssistant), false)
  const mitUser: ChatNachricht[] = [{ rolle: 'user', text: 'Meine Mutter' }]
  assertEquals(verlaufIstGueltig(mitUser), true)
})

Deno.test('verlaufIstGueltig: leere Nachrichten zählen nicht', () => {
  const verlauf: ChatNachricht[] = [
    { rolle: 'user', text: '   ' },
    { rolle: 'assistant', text: 'Frage?' },
  ]
  // Nach dem Filtern beginnt der Verlauf mit assistant -> ungültig
  assertEquals(verlaufIstGueltig(verlauf), false)
})

Deno.test('zuApiMessages: mappt Rollen + filtert Leeres', () => {
  const verlauf: ChatNachricht[] = [
    { rolle: 'user', text: 'Meine Schwester Anna' },
    { rolle: 'assistant', text: 'Super, trag sie ein.' },
    { rolle: 'user', text: '' },
  ]
  assertEquals(zuApiMessages(verlauf), [
    { role: 'user', content: 'Meine Schwester Anna' },
    { role: 'assistant', content: 'Super, trag sie ein.' },
  ])
})

Deno.test('textAusAntwort: nur text-Blöcke, verkettet', () => {
  const content = [
    { type: 'thinking', thinking: 'intern' },
    { type: 'text', text: 'Wer ' },
    { type: 'text', text: 'noch?' },
  ]
  assertEquals(textAusAntwort(content), 'Wer noch?')
})

Deno.test('textAusAntwort: leer, wenn kein text-Block', () => {
  assertEquals(textAusAntwort([{ type: 'tool_use' }]), '')
})
