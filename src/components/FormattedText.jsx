// Shared plain-text-with-light-formatting renderer for admin-editable
// legal/policy/about content (settings/site's *Content fields) — these are
// plain textareas in the admin, not a rich-text editor, but still need
// headings/bullets/bold to read well. One component, used everywhere this
// kind of content is rendered, instead of each page re-implementing its own
// paragraph-splitting.
//
// Rules (checked per line, in this order):
//   "## Heading"           -> <h2>
//   "- bullet"             -> grouped into one <ul><li> (green dot markers)
//   short line (<60 chars, no trailing ".") immediately followed by a
//     longer paragraph line -> treated as an implicit <h2>
//   **bold**               -> <strong> (inline, works inside any line)
//   anything else          -> <p>
function renderInline(text, keyPrefix) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={`${keyPrefix}-b${i}`} className="font-bold text-[#1a1a1a]">{part}</strong> : part
  )
}

export default function FormattedText({ text, className = '' }) {
  const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean)
  const blocks = []
  let bulletBuf = []

  const flushBullets = key => {
    if (!bulletBuf.length) return
    blocks.push(
      <ul key={`ul-${key}`} className="space-y-2 my-3">
        {bulletBuf.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#64ac37] shrink-0 mt-2" />
            <span className="text-gray-600 text-sm sm:text-[15px] leading-relaxed">{renderInline(item, `li-${key}-${i}`)}</span>
          </li>
        ))}
      </ul>
    )
    bulletBuf = []
  }

  lines.forEach((line, i) => {
    if (line.startsWith('## ')) {
      flushBullets(i)
      blocks.push(<h2 key={i} className="font-bold text-[#1655c3] text-lg sm:text-xl mt-6 first:mt-0">{renderInline(line.slice(3), `h-${i}`)}</h2>)
      return
    }
    if (line.startsWith('- ')) {
      bulletBuf.push(line.slice(2))
      return
    }
    flushBullets(i)
    const next = lines[i + 1]
    const isImplicitHeading = line.length < 60 && !line.endsWith('.') && next && next.length >= 60 && !next.startsWith('- ') && !next.startsWith('## ')
    if (isImplicitHeading) {
      blocks.push(<h2 key={i} className="font-bold text-[#1655c3] text-lg sm:text-xl mt-6 first:mt-0">{renderInline(line, `h-${i}`)}</h2>)
      return
    }
    blocks.push(<p key={i} className="text-gray-600 text-sm sm:text-[15px] leading-relaxed">{renderInline(line, `p-${i}`)}</p>)
  })
  flushBullets('end')

  return <div className={`space-y-4 ${className}`}>{blocks}</div>
}
