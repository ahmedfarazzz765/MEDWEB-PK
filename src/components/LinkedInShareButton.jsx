import { useState } from 'react'
import { Linkedin } from 'lucide-react'
import { buildLinkedInShareUrl, buildCertificateCaption } from '../lib/linkedinShare'

// Shared by PortfolioPage.jsx's certificate cards and CertificatePage.jsx's
// detail view. Copies a ready-made caption to the clipboard (LinkedIn's
// share-offsite URL can't be given post-body text directly — see
// lib/linkedinShare.js) and shows a brief toast confirming that, right
// before opening LinkedIn's share dialog.
export default function LinkedInShareButton({ certificateUrl, studentName, courseTitle, className = '' }) {
  const [copied, setCopied] = useState(false)

  const handleShare = e => {
    e.stopPropagation()
    const caption = buildCertificateCaption({ studentName, courseTitle })
    navigator.clipboard?.writeText(caption).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
    window.open(buildLinkedInShareUrl(certificateUrl), '_blank', 'noopener,noreferrer,width=600,height=600')
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={handleShare}
        className={`inline-flex items-center gap-2 text-sm font-bold text-white px-4 py-2.5 rounded-full transition-colors ${className}`}
        style={{ background: '#0A66C2' }}
      >
        <Linkedin size={16} /> Share to LinkedIn
      </button>
      {copied && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-10 whitespace-nowrap bg-[#0B1220] text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg z-10">
          Caption copied — paste it into your LinkedIn post!
        </div>
      )}
    </div>
  )
}
