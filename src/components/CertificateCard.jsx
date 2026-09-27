import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import CertificateTemplate from './CertificateTemplate'
import LinkedInShareButton from './LinkedInShareButton'
import { downloadCertificateImage, downloadCertificatePdf } from '../lib/certificateDownload'

const FORMATS = [
  { key: 'pdf', label: 'PDF' },
  { key: 'jpg', label: 'JPG' },
  { key: 'png', label: 'PNG' },
]

// A real certificate thumbnail — the actual composited image
// (certificateImageUrl) for every certificate issued since the template
// rebuild, or a live-rendered CertificateTemplate for the rare older record
// that only has design data. Used by PortfolioPage.jsx's certificate grid.
// Hover (desktop) or tap (mobile) reveals a "Share to LinkedIn" overlay;
// the Download button offers PDF/JPG/PNG via lib/certificateDownload.js.
export default function CertificateCard({ cert }) {
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [downloading, setDownloading] = useState('') // '' | format key
  const [tapped, setTapped] = useState(false)
  const certUrl = `${window.location.origin}/certificate/${cert.certCode}`
  const title = cert.title || cert.webinarTitle || 'MEDWEB Certificate'

  const handleDownload = async (format) => {
    setDownloadOpen(false)
    setDownloading(format)
    try {
      if (format === 'pdf') await downloadCertificatePdf(cert)
      else await downloadCertificateImage(cert, format)
    } catch (e) {
      alert('Download failed: ' + e.message)
    } finally {
      setDownloading('')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
      {/* Thumbnail — hover (desktop) or tap (mobile) reveals the share overlay */}
      <div
        className="group/cert relative aspect-[1000/707] bg-gray-50 overflow-hidden cursor-pointer"
        onClick={() => setTapped(t => !t)}
      >
        {cert.certificateImageUrl ? (
          <img src={cert.certificateImageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full overflow-hidden">
            <div style={{ transform: 'scale(0.3)', transformOrigin: 'top left' }}>
              <CertificateTemplate {...cert} />
            </div>
          </div>
        )}

        <div className={`absolute inset-0 bg-black/55 flex items-center justify-center transition-opacity duration-200 ${
          tapped ? 'opacity-100' : 'opacity-0 sm:group-hover/cert:opacity-100'
        }`}>
          <LinkedInShareButton certificateUrl={certUrl} studentName={cert.recipient || cert.studentName} courseTitle={title} />
        </div>
      </div>

      {/* Info + actions */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <div className="font-bold text-sm text-[#1a1a1a] leading-snug line-clamp-2">{title}</div>
          {cert.issued && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
              <Calendar size={11} /> Issued {cert.issued}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-auto">
          <Link to={`/certificate/${cert.certCode}`}
            className="flex-1 text-center text-xs font-bold text-[#64ac37] border-2 border-[#64ac37] py-2 rounded-xl hover:bg-green-50 transition-colors">
            Verify
          </Link>
          <div className="relative flex-1">
            <button onClick={() => setDownloadOpen(o => !o)} disabled={!!downloading}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#1655c3] py-2 rounded-xl hover:bg-[#123f8f] disabled:opacity-60 transition-colors">
              <Download size={13} /> {downloading ? `${downloading.toUpperCase()}…` : 'Download'}
              {downloadOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {downloadOpen && (
              <div className="absolute bottom-full mb-1.5 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20">
                {FORMATS.map(f => (
                  <button key={f.key} onClick={() => handleDownload(f.key)}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-blue-50 hover:text-[#1655c3] transition-colors">
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
