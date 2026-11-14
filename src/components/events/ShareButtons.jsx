import { useState } from 'react'
import { Linkedin, Facebook, Link2, Check } from 'lucide-react'

// WhatsApp has no official icon in lucide-react (confirmed elsewhere in
// this codebase — Footer/other share rows already fall back to
// MessageCircle for it), so the same substitute is used here rather than
// pulling in a second icon set for one glyph.
import { MessageCircle } from 'lucide-react'

export default function ShareButtons({ url, title }) {
  const [copied, setCopied] = useState(false)
  const enc = encodeURIComponent(url)
  const encTitle = encodeURIComponent(title)

  const links = [
    { label: 'WhatsApp', Icon: MessageCircle, href: `https://wa.me/?text=${encTitle}%20${enc}`, color: '#25D366' },
    { label: 'LinkedIn', Icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`, color: '#0A66C2' },
    { label: 'Facebook', Icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`, color: '#1877F2' },
  ]

  const copy = () => {
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center gap-2">
      {links.map(({ label, Icon, href, color }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={`Share on ${label}`}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110" style={{ background: color }}>
          <Icon size={15} />
        </a>
      ))}
      <button onClick={copy} title="Copy link" className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
        {copied ? <Check size={15} className="text-green-600" /> : <Link2 size={15} />}
      </button>
    </div>
  )
}
