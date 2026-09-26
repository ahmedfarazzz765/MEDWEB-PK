import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/config'
import { Eye, EyeOff, Lock, Mail, Info, ArrowRight, Megaphone } from 'lucide-react'
import { ambassadorsService } from '../firebase/services'
import AdminButton from '../admin/components/AdminButton'

// Public route /ambassador/login — same signInWithEmailAndPassword pattern
// as AdminLogin.jsx, same shared Firebase Auth project. Explicitly checks
// (after sign-in) that this account actually has a matching ambassadors
// doc, so someone who mistakenly used their admin credentials here gets a
// clear error instead of landing on an empty ambassador dashboard.
export default function AmbassadorLogin() {
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
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const ambassador = await ambassadorsService.getByAuthUid(cred.user.uid)
      if (!ambassador) {
        setError('This account has no Ambassador dashboard set up. Ask the MEDWEB team for an invite link.')
        setLoading(false)
        return
      }
      navigate('/ambassador/dashboard')
    } catch (err) {
      setError(err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
        ? 'Invalid email or password. Please try again.'
        : 'Login failed: ' + err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex bg-[#f0faff]">
      {/* Left branding */}
      <div className="hidden lg:flex flex-col justify-center items-center w-[45%] px-16 relative bg-[#123f8f]">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center mx-auto mb-6"><Megaphone size={36} className="text-white" /></div>
          <div className="text-4xl font-black text-white mb-2">MED<span style={{ color: '#95d348' }}>WEB</span></div>
          <div className="text-white/60 font-medium tracking-widest text-sm uppercase mb-10">Ambassador Dashboard</div>
          <p className="text-white/70 text-sm max-w-xs">Track your referrals, points, and rank progress.</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="text-3xl font-black text-[#1655c3]">MED<span style={{ color: '#64ac37' }}>WEB</span></div>
            <div className="text-gray-500 text-sm font-medium">Ambassador Dashboard</div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-black text-[#1a1a1a]">Welcome back</h1>
              <p className="text-gray-500 text-sm mt-1">Sign in to your Ambassador dashboard</p>
            </div>

            {error && <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Email</label>
                <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#1655c3] focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-gray-50">
                  <Mail size={16} className="text-gray-400 shrink-0" />
                  <input type="email" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400" />
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
                <span>Ambassador accounts are created via an invite link from the MEDWEB team — contact them if you need access.</span>
              </div>

              <AdminButton variant="primary" size="md" className="w-full mt-2" onClick={handleLogin} disabled={loading}>
                {loading ? 'Signing in…' : <>Sign In <ArrowRight size={15} className="ml-1.5" /></>}
              </AdminButton>
            </div>
            <div className="mt-6 text-center"><a href="/" className="text-xs text-gray-400 hover:text-[#1655c3] transition-colors">← Back to MEDWEB Website</a></div>
          </div>
        </div>
      </div>
    </div>
  )
}
