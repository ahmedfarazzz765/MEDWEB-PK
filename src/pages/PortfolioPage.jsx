import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Award, ArrowLeft, Megaphone } from 'lucide-react'
import { studentsDbService, certificatesService, ambassadorsService } from '../firebase/services'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import CertificateCard from '../components/CertificateCard'
import LinkedInShareButton from '../components/LinkedInShareButton'

// Public, no-login credential page — the "verified student portfolio".
// Looked up by portfolioSlug (never by email, phone, or the studentDatabase
// doc ID directly), and only ever renders name + certificates + ambassador
// status: no email/phone/CNIC surfaces here even though the underlying
// student doc (fetched client-side, same trust model as
// AmbassadorProfilePage.jsx) technically carries them. Certificates are
// matched to this student by phone number (see services.js) — the one
// identity field every registration/certificate flow reliably collects and
// that's actually unique per person, unlike name or email.
export default function PortfolioPage() {
  const { slug } = useParams()
  const [student, setStudent] = useState(undefined) // undefined = loading, null = not found
  const [certificates, setCertificates] = useState([])
  const [ambassador, setAmbassador] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    let mounted = true
    studentsDbService.getBySlug(slug).then(async s => {
      if (!mounted) return
      setStudent(s || null)
      if (!s) return

      // Phone is the primary match now (see services.js) — reliable and
      // unique per person, unlike name or (inconsistently-captured) email.
      let certs = s.phone ? await certificatesService.getByPhone(s.phone).catch(() => []) : []
      // Falls back to a case/whitespace-tolerant email scan only when the
      // phone match comes up empty — covers certificates issued before a
      // `phone` field existed on the certificate doc, or a student record
      // that predates phone-keying, without needing a data migration.
      if (certs.length === 0 && s.email) {
        const all = await certificatesService.getAll().catch(() => [])
        certs = all.filter(c => String(c.email || '').trim().toLowerCase() === s.email)
      }

      const amb = await ambassadorsService.getByEmail(s.email).catch(() => null)
      if (!mounted) return
      setCertificates(certs)
      setAmbassador(amb)
    }).catch(() => mounted && setStudent(null))
    return () => { mounted = false }
  }, [slug])

  if (student === undefined) {
    return (
      <div className="font-poppins bg-[#f7f9fc] min-h-screen">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-24 text-center text-gray-400">Loading portfolio…</div>
        <Footer />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="font-poppins bg-[#f7f9fc] min-h-screen">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-black text-[#1a1a1a] mb-3">Portfolio Not Found</h1>
          <p className="text-gray-500 mb-6">This portfolio link may be incorrect.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-full bg-[#1655c3] hover:bg-[#123f8f] transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />

      {/* Hero band */}
      <div className="px-4 pt-10 pb-20 sm:pt-14 sm:pb-28" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
        <div className="max-w-4xl mx-auto">
          <Link to="/" className="flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6 transition-colors w-fit">
            <ArrowLeft size={16} /> Back to MEDWEB
          </Link>
          <h1 className="text-white font-black text-3xl sm:text-4xl leading-tight">{student.name || 'MEDWEB Student'}</h1>
          <div className="flex items-center gap-3 flex-wrap mt-4">
            {ambassador && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full">
                <Megaphone size={12} /> MEDWEB Ambassador{ambassador.rank ? ` · ${ambassador.rank}` : ''}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full">
              <Award size={12} /> {certificates.length} Certificate{certificates.length === 1 ? '' : 's'} Verified
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12 sm:-mt-16 pb-16">
        <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden p-6 sm:p-10 space-y-8">

          {/* Share to LinkedIn — the whole portfolio, not a specific certificate */}
          <div className="flex justify-end">
            <LinkedInShareButton certificateUrl={window.location.href} studentName={student.name} />
          </div>

          {/* Certificates — real certificate thumbnails, each with its own
              Download (PDF/JPG/PNG) and hover/tap "Share to LinkedIn". */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Verified Certificates</p>
            {certificates.length === 0 ? (
              <p className="text-sm text-gray-400">No certificates issued yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {certificates.map(c => <CertificateCard key={c.id} cert={c} />)}
              </div>
            )}
          </div>

          {/* Ambassador Activity */}
          {ambassador && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Ambassador Activity</p>
              <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl p-5">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
                  <Megaphone size={18} className="text-[#64ac37]" />
                </div>
                <div>
                  <div className="font-bold text-sm text-[#1a1a1a]">
                    {ambassador.status === 'Active' ? 'Active' : 'Former'} Ambassador{ambassador.rank ? ` — ${ambassador.rank}` : ''}
                  </div>
                  {ambassador.university && <div className="text-xs text-gray-500">{ambassador.university}</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
