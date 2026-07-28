import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, GraduationCap, BookOpen, CalendarDays, Star, ShieldCheck, Download, FileText, Lock, Linkedin, Instagram, Facebook, MessageCircle, ImageOff } from 'lucide-react'
import { ambassadorsService, settingsService } from '../firebase/services'
import { downloadAmbassadorLetter } from '../lib/ambassadorLetterGenerator'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import CoverImage from '../components/CoverImage'

function normalizeCnic(v) {
  return String(v || '').replace(/[^0-9]/g, '')
}

// Cloudinary URLs are cross-origin, so a plain <a download> won't reliably
// force a save-as in every browser (the `download` attribute is only
// honored cross-origin in some browsers) — fetching the file as a blob and
// downloading that object URL works everywhere, same pattern the old
// canvas-generated card used for its own toBlob() download.
async function downloadImageFile(url, filename) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not fetch the card image')
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  a.click()
  URL.revokeObjectURL(blobUrl)
}

function pointsToStars(points) {
  const p = Number(points) || 0
  if (p >= 15000) return 5
  if (p >= 10000) return 4
  if (p >= 5000)  return 3
  if (p >= 1000)  return 2
  return 1
}

// Only rendered for platforms that actually have a value — empty/unset
// platforms are skipped entirely rather than shown greyed-out or broken.
const SOCIAL_PLATFORMS = [
  { key: 'linkedin',  Icon: Linkedin,      label: 'LinkedIn' },
  { key: 'instagram', Icon: Instagram,     label: 'Instagram' },
  { key: 'facebook',  Icon: Facebook,      label: 'Facebook' },
  { key: 'whatsapp',  Icon: MessageCircle, label: 'WhatsApp' },
]

export default function AmbassadorProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ambassador, setAmbassador] = useState(undefined) // undefined = loading, null = not found
  const [cnicInput, setCnicInput] = useState('')
  const [verifyState, setVerifyState] = useState('idle') // idle | error | verified
  const [verifyError, setVerifyError] = useState('')
  const [downloading, setDownloading] = useState('') // '' | 'card' | 'letter'
  const [downloadError, setDownloadError] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
    ambassadorsService.getOne(id)
      .then(a => setAmbassador(a))
      .catch(() => setAmbassador(null))
  }, [id])

  const handleVerify = () => {
    if (!cnicInput.trim()) { setVerifyState('error'); setVerifyError('Enter your CNIC.'); return }
    if (!ambassador.cnic) { setVerifyState('error'); setVerifyError('No CNIC on file for this ambassador yet — contact the MEDWEB team to add one.'); return }
    if (normalizeCnic(cnicInput) === normalizeCnic(ambassador.cnic)) {
      setVerifyState('verified')
      setVerifyError('')
    } else {
      setVerifyState('error')
      setVerifyError('That CNIC does not match our records. Please check and try again.')
    }
  }

  const handleDownloadCard = async () => {
    if (!ambassador.cardImageUrl) return
    setDownloading('card'); setDownloadError('')
    try {
      const ext = ambassador.cardImageUrl.split('.').pop().split(/[?#]/)[0] || 'png'
      await downloadImageFile(ambassador.cardImageUrl, `MEDWEB-Ambassador-Card-${(ambassador.name || 'ambassador').replace(/\s+/g, '-')}.${ext}`)
    }
    catch (e) { setDownloadError('Card download failed: ' + e.message) }
    finally { setDownloading('') }
  }

  const handleDownloadLetter = async () => {
    setDownloading('letter'); setDownloadError('')
    try {
      const settings = await settingsService.get()
      await downloadAmbassadorLetter(ambassador, settings?.ambassadorLetter)
    } catch (e) { setDownloadError('Letter download failed: ' + e.message) }
    finally { setDownloading('') }
  }

  if (ambassador === undefined) {
    return (
      <div className="font-poppins bg-[#f7f9fc] min-h-screen">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-24 text-center text-gray-400">Loading ambassador profile…</div>
        <Footer />
      </div>
    )
  }

  if (!ambassador) {
    return (
      <div className="font-poppins bg-[#f7f9fc] min-h-screen">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-black text-[#1a1a1a] mb-3">Ambassador Not Found</h1>
          <p className="text-gray-500 mb-6">This profile may have been removed or the link is incorrect.</p>
          <Link to="/#ambassadors" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-full bg-[#1655c3] hover:bg-[#123f8f] transition-colors">
            <ArrowLeft size={16} /> Back to Ambassadors
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  // Ranking is now an explicit admin-set 1-5 value, distinct from Points;
  // pointsToStars only backfills the display for older records saved
  // before the Ranking field existed.
  const stars = ambassador.ranking || pointsToStars(ambassador.points)
  const filledSocials = SOCIAL_PLATFORMS.filter(p => ambassador.socialLinks?.[p.key])

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />

      <div className="px-4 pt-10 pb-20 sm:pt-14 sm:pb-28" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <span className="inline-block text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full mb-4">{ambassador.rank || 'Ambassador'}</span>
          <h1 className="text-white font-black text-3xl sm:text-4xl leading-tight">{ambassador.name}</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-12 sm:-mt-16 pb-16">
        <motion.div
          className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-6 sm:p-8 space-y-6">
            {/* 1. Photo, Name, Ambassador Code */}
            <div className="flex items-center gap-4">
              {ambassador.imageUrl
                ? <CoverImage src={ambassador.imageUrl} alt={ambassador.name} bias="center 25%" className="w-20 h-20 rounded-full ring-4 ring-white shadow-md" />
                : <div className="w-20 h-20 rounded-full bg-[#1655c3] flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white shadow-md">{ambassador.name?.charAt(0)}</div>}
              <div className="min-w-0">
                <div className="font-bold text-[#1a1a1a] text-lg truncate">{ambassador.name}</div>
                {ambassador.ambCode && <div className="text-xs font-mono text-gray-400 mt-0.5">{ambassador.ambCode}</div>}
              </div>
            </div>

            {/* 2. University, Degree Program, Semester */}
            <div className="grid sm:grid-cols-2 gap-4">
              {ambassador.university && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <GraduationCap size={18} className="text-[#1655c3] shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">University</div>
                    <div className="text-sm font-semibold text-[#1a1a1a]">{ambassador.university}</div>
                  </div>
                </div>
              )}
              {ambassador.city && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <MapPin size={18} className="text-[#64ac37] shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">City</div>
                    <div className="text-sm font-semibold text-[#1a1a1a]">{ambassador.city}</div>
                  </div>
                </div>
              )}
              {ambassador.degreeProgram && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <BookOpen size={18} className="text-[#1655c3] shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Degree Program</div>
                    <div className="text-sm font-semibold text-[#1a1a1a]">{ambassador.degreeProgram}</div>
                  </div>
                </div>
              )}
              {ambassador.semester && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <CalendarDays size={18} className="text-[#64ac37] shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Semester</div>
                    <div className="text-sm font-semibold text-[#1a1a1a]">{ambassador.semester}</div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Rank + star Ranking */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-[#1655c3]">{ambassador.rank || 'Ambassador'}</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(n => <Star key={n} size={16} className={n <= stars ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />)}
              </div>
            </div>

            {/* 4. Status, Points */}
            <div className="text-sm text-gray-500">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ambassador.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{ambassador.status}</span>
              {ambassador.points > 0 && (
                <span className="ml-3">
                  <span className="font-black text-[#1655c3] text-base">{Number(ambassador.points).toLocaleString()}</span> points
                  {ambassador.students > 0 && <> · <span className="font-black text-[#64ac37] text-base">{ambassador.students}</span> students referred</>}
                </span>
              )}
            </div>

            {/* 5. Social links — only platforms with a value, blank ones are skipped entirely */}
            {filledSocials.length > 0 && (
              <div className="flex items-center gap-3">
                {filledSocials.map(({ key, Icon, label }) => (
                  <a key={key} href={ambassador.socialLinks[key]} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:text-[#1655c3] hover:border-[#1655c3] transition-colors">
                    <Icon size={17} />
                  </a>
                ))}
              </div>
            )}

            {/* 6. Card preview (always visible) + CNIC-gated downloads */}
            <div className="border-t border-gray-100 pt-6">
              <h2 className="font-bold text-[#1a1a1a] text-base mb-2 flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#1655c3]" /> Your Ambassador Card & Letter
              </h2>

              {/* Card preview — visible to everyone regardless of CNIC verification; only the
                  actual file download is gated below. */}
              <div className="flex justify-center mb-5">
                {ambassador.cardImageUrl ? (
                  <img
                    src={ambassador.cardImageUrl}
                    alt={`${ambassador.name}'s Ambassador Card`}
                    className="max-w-[260px] w-full rounded-2xl border border-gray-100 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                  />
                ) : (
                  <div className="w-full max-w-[260px] aspect-[2/3] rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400 gap-2">
                    <ImageOff size={28} />
                    <span className="text-xs font-semibold">Card not yet available</span>
                  </div>
                )}
              </div>

              {verifyState !== 'verified' ? (
                <>
                  <p className="text-sm text-gray-500 mb-3">Enter your CNIC to verify your identity before downloading.</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus-within:border-[#1655c3] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                      <Lock size={15} className="text-gray-400 shrink-0" />
                      <input
                        value={cnicInput}
                        onChange={e => { setCnicInput(e.target.value); setVerifyState('idle') }}
                        onKeyDown={e => e.key === 'Enter' && handleVerify()}
                        placeholder="12345-1234567-1"
                        className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400"
                      />
                    </div>
                    <button
                      onClick={handleVerify}
                      className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#1655c3] hover:bg-[#123f8f] transition-colors whitespace-nowrap"
                    >
                      Verify
                    </button>
                  </div>
                  {verifyState === 'error' && <p className="text-red-500 text-xs mt-2">{verifyError}</p>}
                </>
              ) : (
                <>
                  <p className="text-sm text-green-600 font-semibold mb-3">✓ Verified — you can now download your documents.</p>
                  <div className="flex flex-wrap gap-3">
                    {ambassador.cardImageUrl && (
                      <button
                        onClick={handleDownloadCard}
                        disabled={downloading === 'card'}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#1655c3] hover:bg-[#123f8f] transition-colors disabled:opacity-60"
                      >
                        <Download size={15} /> {downloading === 'card' ? 'Downloading…' : 'Download Ambassador Card'}
                      </button>
                    )}
                    <button
                      onClick={handleDownloadLetter}
                      disabled={downloading === 'letter'}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#1655c3] border-2 border-[#1655c3] hover:bg-blue-50 transition-colors disabled:opacity-60"
                    >
                      <FileText size={15} /> {downloading === 'letter' ? 'Generating…' : 'Download Ambassador Letter'}
                    </button>
                  </div>
                  {downloadError && <p className="text-red-500 text-xs mt-2">{downloadError}</p>}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  )
}
