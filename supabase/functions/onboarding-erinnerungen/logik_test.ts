import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1'
import { anrede, baueMail, escapeHtml, istSendbereit, type Vorlage } from './logik.ts'

const sendbereit: Vorlage = {
  trigger_typ: 'fuehrungszeugnis_abgegeben',
  betreff: 'Nächster Schritt',
  inhalt: 'Hi {{name}},\nweiter geht es mit den Onlineverträgen.',
  tutorial_url: 'https://example.com/tutorial',
  aktiv: true,
}

Deno.test('istSendbereit: aktive Vorlage mit URL ist sendbereit', () => {
  assert(istSendbereit(sendbereit))
})

Deno.test('istSendbereit: ENTWURF-Platzhalter (inaktiv, keine URL) sendet NIE', () => {
  const entwurf: Vorlage = { ...sendbereit, aktiv: false, tutorial_url: null }
  assertEquals(istSendbereit(entwurf), false)
})

Deno.test('istSendbereit: aktiv aber ohne URL ist nicht sendbereit', () => {
  assertEquals(istSendbereit({ ...sendbereit, tutorial_url: '' }), false)
})

Deno.test('istSendbereit: URL gesetzt aber inaktiv ist nicht sendbereit', () => {
  assertEquals(istSendbereit({ ...sendbereit, aktiv: false }), false)
})

Deno.test('anrede: erstes Wort des Namens', () => {
  assertEquals(anrede('Jonas Demo'), 'Jonas')
  assertEquals(anrede('  Mara  '), 'Mara')
})

Deno.test('anrede: leerer Name -> neutrales Fallback', () => {
  assertEquals(anrede(null), 'zusammen')
  assertEquals(anrede(''), 'zusammen')
})

Deno.test('baueMail: ersetzt {{name}} und hängt Tutorial-Link an', () => {
  const mail = baueMail(sendbereit, { name: 'Jonas Demo', email: 'jonas@test.de' })
  assertEquals(mail.to, 'jonas@test.de')
  assertEquals(mail.subject, 'Nächster Schritt')
  assert(mail.text.includes('Hi Jonas,'))
  assert(!mail.text.includes('{{name}}'))
  assert(mail.text.includes('https://example.com/tutorial'))
  assert(mail.html.includes('Hi Jonas,'))
  assert(mail.html.includes('href="https://example.com/tutorial"'))
  // Zeilenumbruch im Inhalt wird zu <br>
  assert(mail.html.includes('<br>'))
})

Deno.test('baueMail: wirft ohne Empfänger-E-Mail', () => {
  assertThrows(() => baueMail(sendbereit, { name: 'X', email: null }), Error, 'ohne E-Mail')
})

Deno.test('baueMail: wirft bei nicht sendbereiter Vorlage', () => {
  const entwurf: Vorlage = { ...sendbereit, aktiv: false, tutorial_url: null }
  assertThrows(() => baueMail(entwurf, { name: 'X', email: 'x@test.de' }), Error, 'nicht sendbereit')
})

Deno.test('escapeHtml: entschärft HTML-Sonderzeichen (XSS-Schutz im Mail-Body)', () => {
  assertEquals(escapeHtml('<b>a</b> & "x"'), '&lt;b&gt;a&lt;/b&gt; &amp; &quot;x&quot;')
})

Deno.test('baueMail: Name mit HTML wird im html-Teil escaped', () => {
  const mail = baueMail(sendbereit, { name: '<script>evil', email: 'x@test.de' })
  assert(!mail.html.includes('<script>evil'))
  assert(mail.html.includes('&lt;script&gt;evil'))
})
