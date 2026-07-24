import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/config'
import { Eye, EyeOff, Lock, Mail, Info, ArrowRight, CheckCircle2 } from 'lucide-react'
import logo from '../assets/medweb.png'
import AdminButton from './components/AdminButton'

const FEATURES = [
  'Manage all students & enrollments',
  'Track webinars & attendance',
  'Issue & verify certificates',
  'Monitor ambassadors & revenue',
  'Upload photos to Cloudinary',
  'All data saved to Firebase',
]

export default function AdminLogin() {
  const [showPw,    setShowPw]    = useState(false)
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true); setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/admin')
    } catch (err) {
      setError(err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
        ? 'Invalid email or password. Please try again.'
        : 'Login failed: ' + err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex bg-[#f0faff]">
      {/* Left branding */}
      <div
        className="hidden lg:flex flex-col justify-center items-center w-[45%] px-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(155deg, #0B1220 0%, #101c33 45%, #123f8f 85%, #1655c3 100%)' }}
      >
        {/* Soft green brand glow + dot-grid texture, kept subtle behind the content */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: '#64ac37' }} />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        {/* Oversized watermark of the real logo for depth, bottom-left */}
        <img src={logo} alt="" aria-hidden="true" className="absolute -bottom-16 -left-16 w-72 h-72 opacity-[0.06] object-contain select-none pointer-events-none" />

        <div className="relative z-10 text-center">
          <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center mx-auto mb-7 shadow-[0_12px_32px_rgba(0,0,0,0.25)] p-3">
            <img src={logo} alt="MEDWEB" className="w-full h-full object-contain" />
          </div>
          <div className="text-4xl font-black text-white mb-1.5 tracking-tight">MED<span style={{ color: '#95d348' }}>WEB</span></div>
          <div className="text-[#95d348] font-bold tracking-[0.2em] text-xs uppercase mb-10">Admin Panel</div>

          <div className="h-px w-16 mx-auto mb-9" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }} />

          <div className="space-y-3.5 text-left max-w-xs mx-auto">
            {FEATURES.map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-white/85 text-sm font-medium">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(149,211,72,0.18)' }}>
                  <CheckCircle2 size={14} style={{ color: '#95d348' }} />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-3 shadow-md p-2 border border-gray-100">
              <img src={logo} alt="MEDWEB" className="w-full h-full object-contain" />
            </div>
            <div className="text-3xl font-black text-[#1655c3]">MED<span style={{ color: '#64ac37' }}>WEB</span></div>
            <div className="text-gray-500 text-sm font-medium">Admin Panel</div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-black text-[#1a1a1a]">Welcome back</h1>
              <p className="text-gray-500 text-sm mt-1">Sign in to access the MEDWEB admin panel</p>
            </div>

            {error && <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Email</label>
                <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#1655c3] focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-gray-50">
                  <Mail size={16} className="text-gray-400 shrink-0" />
                  <input type="email" placeholder="admin@medweb.pk" value={email} onChange={e => { setEmail(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Password</label>
                <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#1655c3] focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-gray-50">
                  <Lock size={16} className="text-gray-400 shrink-0" />
                  <input type={showPw ? 'text' : 'password'} placeholder="Enter password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400" />
                  <button onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600 transition-colors">{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-gray-500 bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                <Info size={14} className="text-[#1655c3] shrink-0 mt-0.5" />
                <span>New admin accounts are created via an invite link from an existing Super Admin — contact your Super Admin if you need access.</span>
              </div>

              <AdminButton variant="primary" size="md" className="w-full mt-2" onClick={handleLogin} disabled={loading}>
                {loading ? 'Signing in…' : <>Sign In to Admin Panel <ArrowRight size={15} className="ml-1.5" /></>}
              </AdminButton>
            </div>
            <div className="mt-6 text-center"><a href="/" className="text-xs text-gray-400 hover:text-[#1655c3] transition-colors">← Back to MEDWEB Website</a></div>
          </div>
        </div>
      </div>
    </div>
  )
}
