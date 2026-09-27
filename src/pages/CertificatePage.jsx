import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Download, ArrowLeft, ShieldCheck, User, ChevronDown, ChevronUp } from 'lucide-react'
import CertificateTemplate from '../components/CertificateTemplate'
import LinkedInShareButton from '../components/LinkedInShareButton'
import { certificatesService, studentsDbService } from '../firebase/services'
import { downloadCertificateImage, downloadCertificatePdf } from '../lib/certificateDownload'
import { setPageMeta } from '../lib/pageMeta'

const DOWNLOAD_FORMATS = [
  { key: 'pdf', label: 'PDF' },
  { key: 'jpg', label: 'JPG' },
  { key: 'png', label: 'PNG' },
]

export default function CertificatePage() {
  const { code } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [cert, setCert]       = useState(null)
  const [status, setStatus]   = useState('loading')   // loading | found | notfound | revoked
  const [scale, setScale]     = useState(1)
  const [portfolioSlug, setPortfolioSlug] = useState('')
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [downloading, setDownloading] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    let alive = true
    certificatesService.getByCode(code).then(c => {
      if (!alive) return
      if (!c) { setStatus('notfound'); return }
      setCert(c)
      setStatus(c.status === 'Revoked' ? 'revoked' : 'found')
      // count a verification view (best-effort)
      certificatesService.verify(code).catch(() => {})
      // Best-effort per-certificate Open Graph tags — correct for a real
      // visitor's tab title/description, and for any link-preview crawler
      // that executes JS. NOT guaranteed for LinkedIn specifically: this is
      // a static client-rendered SPA with no server-side rendering, and
      // LinkedIn's own crawler fetches raw HTML without running JavaScript,
      // so it will typically still show index.html's site-wide defaults
      // instead. Fixing that for real needs a prerendering step or a
      // small server-rendered endpoint for this route — out of scope here.
      setPageMeta({
        title: `${c.recipient || c.student || 'A student'} completed ${c.title || c.course || 'a MEDWEB program'} — verified by MEDWEB-PK`,
        description: `Verified certificate from MEDWEB-PK, Pakistan's medical education platform founded by Dr. Shahroz Abbas — medical education, pharmacy, and healthcare training for students across Pakistan.`,
        image: c.certificateImageUrl || `${window.location.origin}/favicon.png`,
        url: window.location.href,
      })
      // "View Full Portfolio" discovery link — best-effort, never blocks
      // the certificate itself from rendering if the student record or
      // its slug isn't there yet (e.g. a pre-portfolio-feature record that
      // hasn't been touched by any upsert since). Phone first (the primary
      // identity key — see services.js), falling back to email for
      // certificates issued before `phone` was captured on the cert doc.
      const findPortfolio = async () => {
        const byPhone = c.phone ? await studentsDbService.getByPhone(c.phone).catch(() => null) : null
        const s = byPhone || (c.email ? await studentsDbService.getByEmail(c.email).catch(() => null) : null)
        if (alive && s?.portfolioSlug) setPortfolioSlug(s.portfolioSlug)
      }
      findPortfolio()
    }).catch(() => alive && setStatus('notfound'))
    return () => { alive = false }
  }, [code])

  // responsive scaling of the fixed 1000x707 certificate to fit the screen width
  useEffect(() => {
    const fit = () => {
      const w = wrapRef.current?.clientWidth || 1000
      setScale(Math.min(1, w / 1000))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [status])

  // auto-print when opened with ?print=1
  useEffect(() => {
    if (status === 'found' && params.get('print') === '1') {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [status, params])

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

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 font-poppins">Loading certificate…</div>
  }

  if (status === 'notfound' || status === 'revoked') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-poppins bg-[#f7f9fc] px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-5">
          <XCircle size={44} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-[#1a1a1a] mb-2">
          {status === 'revoked' ? 'Certificate Revoked' : 'Certificate Not Found'}
        </h1>
        <p className="text-gray-500 mb-1 max-w-md">
          {status === 'revoked'
            ? 'This certificate has been revoked by MEDWEB and is no longer valid.'
            : 'No certificate matches this code. Please check the code and try again.'}
        </p>
        <p className="text-xs font-mono text-gray-400 mb-8">{code}</p>
        <button onClick={() => navigate('/')} className="px-8 py-3 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#1655c3,#64ac37)' }}>Back to Home</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen font-poppins bg-[#f7f9fc]">
      {/* top bar — hidden when printing */}
      <div className="print:hidden bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1655c3]">
            <ArrowLeft size={16} /> Home
          </button>
          <div className="flex items-center gap-2 text-sm font-bold text-[#64ac37]">
            <ShieldCheck size={18} /> Verified Certificate
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* verified banner */}
        <div className="print:hidden mb-6 rounded-2xl p-4 flex items-center gap-3 bg-green-50 border border-green-100">
          <CheckCircle size={22} className="text-[#64ac37] shrink-0" />
          <div className="text-sm">
            <span className="font-bold text-green-700">This certificate is authentic.</span>
            <span className="text-gray-500"> Issued by MEDWEB-PK · Code {cert.certCode} · Verified {cert.verifications || 1}×</span>
          </div>
        </div>

        {/* the certificate — an auto-generated webinar certificate is a real
            image (certificateImageUrl); manually-created ones render live
            from data via CertificateTemplate as before */}
        {cert.certificateImageUrl ? (
          <div className="cert-print-area flex justify-center">
            <img src={cert.certificateImageUrl} alt={`Certificate ${cert.certCode}`} className="max-w-full rounded-2xl shadow-lg" />
          </div>
        ) : (
          <div ref={wrapRef} className="cert-print-area flex justify-center">
            <div style={{ width: 1000 * scale, height: 707 * scale }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                <CertificateTemplate {...cert} />
              </div>
            </div>
          </div>
        )}

        {/* actions — hidden when printing */}
        <div className="print:hidden mt-8 flex flex-wrap gap-3 justify-center">
          <div className="relative">
            <button onClick={() => setDownloadOpen(o => !o)} disabled={!!downloading}
              className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#1655c3,#64ac37)', boxShadow: '0 6px 20px rgba(22,85,195,0.3)' }}>
              <Download size={16} /> {downloading ? `Downloading ${downloading.toUpperCase()}…` : 'Download'}
              {downloadOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {downloadOpen && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20 min-w-[120px]">
                {DOWNLOAD_FORMATS.map(f => (
                  <button key={f.key} onClick={() => handleDownload(f.key)}
                    className="w-full text-center px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-blue-50 hover:text-[#1655c3] transition-colors">
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <LinkedInShareButton certificateUrl={window.location.href} studentName={cert.recipient || cert.student} courseTitle={cert.title || cert.course} />
          <button onClick={() => { navigator.clipboard?.writeText(window.location.href); alert('Link copied!') }}
            className="px-7 py-3 rounded-xl text-sm font-bold text-[#1655c3] border-2 border-[#1655c3] hover:bg-blue-50">
            Share Link
          </button>
          {portfolioSlug && (
            <Link to={`/portfolio/${portfolioSlug}`}
              className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-[#64ac37] border-2 border-[#64ac37] hover:bg-green-50">
              <User size={16} /> View Full Portfolio
            </Link>
          )}
        </div>
      </div>

      {/* print styling: show only the certificate, landscape, full bleed */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { background: #fff !important; }
          .print\\:hidden { display: none !important; }
          .cert-print-area { transform: none !important; }
          .cert-print-area > div { width: 1000px !important; height: 707px !important; }
          .cert-print-area > div > div { transform: scale(1) !important; }
        }
      `}</style>
    </div>
  )
}
