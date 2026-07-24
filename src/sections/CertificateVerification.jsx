import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Shield, CheckCircle, Lock, Zap, Award, ShieldCheck } from 'lucide-react'
import { certificatesService } from '../firebase/services'
import { useSiteSettings } from '../hooks/useSiteSettings'
import SectionHeading from '../components/SectionHeading'
import BrandWatermark from '../components/BrandWatermark'

const TRUST_ICONS = [Lock, Zap, Award, ShieldCheck]

const DEFAULTS = {
  certHeading1: 'Certificate',
  certHeading2: 'Verification',
  certSubtitle: 'Verify the authenticity of any MEDWEB certificate instantly using its unique verification code.',
  certTrustPoints: ['Secure & Trusted', 'Instant Verification', 'Recognized Across Pakistan', 'Tamper Proof'],
}

export default function CertificateVerification() {
  const [code,   setCode]   = useState('')
  const [status, setStatus] = useState(null)  // null | 'checking' | 'valid' | 'invalid'
  const [result, setResult] = useState(null)
  const d = useSiteSettings(DEFAULTS)

  const handleVerify = async () => {
    if (!code.trim()) return
    setStatus('checking'); setResult(null)
    try {
      const cert = await certificatesService.verify(code.trim())
      if (cert) { setStatus('valid'); setResult(cert) }
      else       { setStatus('invalid') }
    } catch { setStatus('invalid') }
  }

  return (
    <section id="certificates" className="py-10 sm:py-12 px-4 bg-[#f7f9fc] relative overflow-hidden">
      <BrandWatermark seed={3} />
      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
          className="rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
          style={{background:'linear-gradient(135deg,#1655c3 0%,#0f3d8c 100%)'}}>
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-6 right-10 w-28 h-28 rounded-full border-4 border-white"/>
            <div className="absolute bottom-6 left-10 w-20 h-20 rounded-full border-4 border-white"/>
          </div>

          <div className="relative z-10 grid lg:grid-cols-[1fr_1.1fr] gap-8 items-center">
            {/* LEFT — icon + heading + text */}
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3"><Shield size={22} className="text-white"/></div>
              <SectionHeading word1={d.certHeading1} word2={d.certHeading2} dark className="mb-2" />
              <p className="text-white/80 text-sm">{d.certSubtitle}</p>

              <div className="flex justify-center gap-6 mt-5">
                {d.certTrustPoints.map((label, i) => {
                  const Icon = TRUST_ICONS[i % TRUST_ICONS.length]
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5 max-w-[80px]">
                      <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                        <Icon size={14} className="text-white" />
                      </div>
                      <span className="text-[10px] text-white/70 font-medium leading-tight text-center">{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* RIGHT — input + button + result */}
            <div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input type="text" value={code} onChange={e=>{setCode(e.target.value);setStatus(null)}} onKeyDown={e=>e.key==='Enter'&&handleVerify()}
                    placeholder="Enter Certificate Code"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-gray-700 text-sm font-medium outline-none placeholder-gray-400 shadow-sm"/>
                </div>
                <button onClick={handleVerify} disabled={status==='checking'}
                  className="px-6 py-3 bg-white text-[#1655c3] font-bold rounded-xl text-sm hover:-translate-y-0.5 disabled:opacity-70 flex-shrink-0 transition-all shadow-md">
                  {status==='checking'?'Verifying…':'Verify Now'}
                </button>
              </div>

              {status==='valid'&&result&&(
                <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="mt-4 bg-white/15 backdrop-blur rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                  <CheckCircle size={20} className="text-white flex-shrink-0"/>
                  <div className="text-left flex-1">
                    <div className="text-white font-bold text-sm">✅ Certificate Verified Successfully</div>
                    <div className="text-white/70 text-xs mt-0.5">{result.recipient || result.student} · {result.title || result.course} · Issued {result.issued}</div>
                  </div>
                  <a href={`/certificate/${result.certCode || code.trim()}`} target="_blank" rel="noreferrer"
                    className="text-xs font-bold text-[#1655c3] bg-white px-4 py-2 rounded-lg whitespace-nowrap text-center">
                    View Certificate →
                  </a>
                </motion.div>
              )}
              {status==='invalid'&&(
                <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="mt-4 bg-red-500/20 backdrop-blur rounded-xl p-3.5 flex items-center gap-3">
                  <Shield size={20} className="text-white flex-shrink-0"/>
                  <div className="text-left"><div className="text-white font-bold text-sm">❌ Certificate Not Found</div><div className="text-white/70 text-xs">Please check the code and try again.</div></div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
