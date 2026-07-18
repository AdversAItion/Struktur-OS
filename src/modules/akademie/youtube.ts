/**
 * Wandelt eine YouTube-URL (watch, youtu.be, shorts, bereits embed) in eine
 * einbettbare URL um. `null`, wenn keine YouTube-Video-ID erkennbar ist —
 * so kann die Lektionsseite dann einfach keinen Player zeigen.
 */
export function zuYoutubeEmbed(url: string): string | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }

  let id: string | null = null
  if (u.hostname.includes('youtu.be')) {
    id = u.pathname.slice(1)
  } else if (u.hostname.includes('youtube.com')) {
    if (u.pathname === '/watch') id = u.searchParams.get('v')
    else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/embed/')[1]
    else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/shorts/')[1]
  }
  id = id ? id.split(/[/?&]/)[0] : null

  // youtube-nocookie.com: kein Tracking-Cookie, bevor jemand auf Play klickt.
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
}
