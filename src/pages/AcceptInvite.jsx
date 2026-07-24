import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/config'
import { adminInvitesService, adminUsersService } from '../firebase/services'
import { Shield, Eye, EyeOff, Lock, User, Mail, CheckCircle, XCircle } from 'lucide-react'
import AdminButton from '../admin/components/AdminButton'

// Public route /admin/invite/:token — the Super Admin never touches this
// page. The invited person opens it in THEIR OWN browser and creates THEIR
// OWN Firebase Auth account here (createUserWithEmailAndPassword), which
// only ever signs in the browser it runs in — the Super Admin's own admin
// session (a different browser/device) is completely unaffected.
export default function AcceptInvite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState('loading') // loading | invalid | claimed | ready | success
  const [invite, setInvite] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    adminInvitesService.getByToken(token)
      .then(inv => {
        if (!inv) { setState('invalid'); return }
        if (inv.claimed) { setState('claimed'); return }
        setInvite(inv)
        setState('ready')
      })
      .catch(() => setState('invalid'))
  }, [token])

  const handleAccept = async () => {
    if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setSubmitting(true)
    setError('')
    try {
      await createUserWithEmailAndPassword(auth, invite.email, password)
      await adminUsersService.create(invite.email, {
        name: invite.name,
        allowedSections: invite.allowedSections || [],
      })
      await adminInvitesService.claim(token)
      setState('success')
      setTimeout(() => navigate('/admin'), 1500)
    } catch (err) {
      setError(
        err.code === 'auth/email-already-in-use' ? 'An account with this email already exists — try logging in instead.'
        : err.code === 'auth/weak-password' ? 'Please choose a stronger password.'
        : 'Something went wrong: ' + err.message
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#f0faff]">
      {/* Left branding */}
      <div className="hidden lg:flex flex-col justify-center items-center w-[45%] px-16 relative bg-[#123f8f]">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center mx-auto mb-6"><Shield size={36} className="text-white" /></div>
          <div className="text-4xl font-black text-white mb-2">MED<span style={{ color: '#95d348' }}>WEB</span></div>
          <div className="text-white/60 font-medium tracking-widest text-sm uppercase mb-10">Admin Invite</div>
          <p className="text-white/70 text-sm max-w-xs">You've been invited to join the MEDWEB admin panel with a specific set of permissions.</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="text-3xl font-black text-[#1655c3]">MED<span style={{ color: '#64ac37' }}>WEB</span></div>
            <div className="text-gray-500 text-sm font-medium">Admin Invite</div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            {state === 'loading' && (
              <p className="text-center text-gray-400 text-sm py-8">Loading invite…</p>
            )}

            {state === 'invalid' && (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4"><XCircle size={26} className="text-red-400" /></div>
                <h1 className="text-xl font-black text-[#1a1a1a] mb-2">Invalid Invite Link</h1>
                <p className="text-gray-500 text-sm">This invite doesn't exist or the link is incorrect. Ask the Super Admin to send a new one.</p>
              </div>
            )}

            {state === 'claimed' && (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-2xl bg-yellow-50 flex items-center justify-center mx-auto mb-4"><XCircle size={26} className="text-yellow-500" /></div>
                <h1 className="text-xl font-black text-[#1a1a1a] mb-2">This Invite Has Already Been Used</h1>
                <p className="text-gray-500 text-sm mb-6">If this is your account, sign in instead.</p>
                <a href="/admin/login" className="inline-block px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1655c3] hover:bg-[#123f8f] transition-colors">Go to Sign In</a>
              </div>
            )}

            {state === 'success' && (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4"><CheckCircle size={26} className="text-green-600" /></div>
                <h1 className="text-xl font-black text-[#1a1a1a] mb-2">You're All Set!</h1>
                <p className="text-gray-500 text-sm">Taking you to the admin panel…</p>
              </div>
            )}

            {state === 'ready' && (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-black text-[#1a1a1a]">Set up your account</h1>
                  <p className="text-gray-500 text-sm mt-1">You've been invited as an admin — choose a password to finish.</p>
                </div>

                {error && <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">{error}</div>}

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Name</label>
                    <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 bg-gray-100">
                      <User size={16} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-600">{invite.name}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Email</label>
                    <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 bg-gray-100">
                      <Mail size={16} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-600">{invite.email}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Password</label>
                    <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#1655c3] focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-gray-50">
                      <Lock size={16} className="text-gray-400 shrink-0" />
                      <input type={showPw ? 'text' : 'password'} placeholder="At least 6 characters" value={password} onChange={e => { setPassword(e.target.value); setError('') }} className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400" />
                      <button onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600 transition-colors">{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Confirm Password</label>
                    <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#1655c3] focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-gray-50">
                      <Lock size={16} className="text-gray-400 shrink-0" />
                      <input type={showPw ? 'text' : 'password'} placeholder="Re-enter password" value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && handleAccept()} className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400" />
                    </div>
                  </div>

                  <AdminButton variant="primary" size="md" className="w-full mt-2" onClick={handleAccept} disabled={submitting}>
                    {submitting ? 'Setting up…' : 'Create My Account'}
                  </AdminButton>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
