# Modul: benefits

## Zweck
Öffentliche **Rekrutierungs-Showpiece**-Seite mit 3D-Hero (Three.js) im
Schwarz/Gold-Design. Zeigt Interessenten (ohne Account) die Vorteile, Teil der
Struktur zu werden.

## Route
`/benefits` — **öffentlich**, außerhalb von `<Geschuetzt>` und ohne App-Nav
(siehe `src/App.tsx`). Lazy geladen, damit Three.js nicht ins Haupt-Bundle kommt.

## Aufbau
- `BenefitsSeite.tsx` — Hero (3D + Headline + CTA), Benefit-Karten, Kontakt-Sektion.
- `Szene.tsx` — react-three-fiber-Canvas: gold-schwarzes rotierendes Icosaeder-
  Netzwerk (Metapher: wachsende Struktur). Unlit (`meshBasicMaterial`) für
  Robustheit + Mobile-Performance; `dpr` gekappt. Rotation respektiert
  `prefers-reduced-motion`.
- `HeroFallback.tsx` — statischer Gold-Schimmer + `SzeneGrenze` (ErrorBoundary):
  wird gezeigt, während Three.js lädt (Suspense) und wenn WebGL fehlt. Die Seite
  bleibt also immer ansehnlich.

## Performance
Three.js liegt in einem eigenen Chunk (`Szene-*.js`, ~235 KB gzip), der **nur** auf
`/benefits` lädt. Das Haupt-Bundle der App bleibt davon unberührt.

## Offen (Audit)
- **Texte sind ENTWURF** (auf der Seite oben markiert) — echte Copy vom Vertrieb.
  Keine erfundenen Zahlen/Testimonials/Verknappung (CLAUDE.md).
- **Kontaktweg** ist als `[OFFEN: …]` markiert — echten Kanal eintragen.
- Falls die Seite indexierbar sein soll: `netlify.toml` setzt projektweit
  `noindex` — dann braucht `/benefits` eine Header-Ausnahme.

## Abhängigkeiten
- `three`, `@react-three/fiber`
- Kein Supabase-Bezug (rein präsentativ).
