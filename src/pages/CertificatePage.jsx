import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Download, ArrowLeft, ShieldCheck } from 'lucide-react'
import CertificateTemplate from '../components/CertificateTemplate'
import { certificatesService } from '../firebase/services'

export default function CertificatePage() {
  const { code } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [cert, setCert]       = useState(null)
  const [status, setStatus]   = useState('loading')   // loading | found | notfound | revoked
  const [scale, setScale]     = useState(1)
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
          {cert.certificateImageUrl ? (
            <a href={cert.certificateImageUrl} download={`${cert.certCode}.png`}
              className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#1655c3,#64ac37)', boxShadow: '0 6px 20px rgba(22,85,195,0.3)' }}>
              <Download size={16} /> Download Certificate
            </a>
          ) : (
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#1655c3,#64ac37)', boxShadow: '0 6px 20px rgba(22,85,195,0.3)' }}>
              <Download size={16} /> Download / Print PDF
            </button>
          )}
          <button onClick={() => { navigator.clipboard?.writeText(window.location.href); alert('Link copied!') }}
            className="px-7 py-3 rounded-xl text-sm font-bold text-[#1655c3] border-2 border-[#1655c3] hover:bg-blue-50">
            Share Link
          </button>
        </div>
        {!cert.certificateImageUrl && (
          <p className="print:hidden text-center text-xs text-gray-400 mt-4">
            Tip: in the print dialog, choose “Save as PDF” as the destination.
          </p>
        )}
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
