import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Styling über die Component-Map von react-markdown statt eines Typography-
 * Plugins — hält die Farben strikt auf den vier Tokens aus CLAUDE.md (kein
 * @tailwindcss/typography, das eigene Grautöne mitbringt).
 */
const KOMPONENTEN: Components = {
  h1: ({ children }) => (
    <h1 className="mt-6 font-display text-2xl font-extrabold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-5 font-display text-xl font-bold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 font-display text-lg font-bold first:mt-0">{children}</h3>
  ),
  p: ({ children }) => <p className="mt-3 leading-relaxed text-text first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="mt-3 list-disc space-y-1.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1.5 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed text-text">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-gold underline underline-offset-4 hover:opacity-80"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-bold text-text">{children}</strong>,
  code: ({ children }) => (
    <code className="num rounded bg-bg px-1.5 py-0.5 text-[0.9em] text-gold">{children}</code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-3 border-l-2 border-gold pl-4 text-muted">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-line px-2 py-1.5 text-left text-muted">{children}</th>
  ),
  td: ({ children }) => <td className="border-b border-line px-2 py-1.5">{children}</td>,
}

export function MarkdownInhalt({ markdown }: { markdown: string }) {
  return (
    <div className="text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={KOMPONENTEN}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
