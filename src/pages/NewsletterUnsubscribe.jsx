import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle } from 'lucide-react'
import { newsletterService } from '../firebase/services'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'

// Public route /unsubscribe?email=... — linked from every newsletter email.
// This is a plain client-side Firestore update (no Cloud Function), which
// needs a narrowly-scoped Firestore rule allowing an UNAUTHENTICATED update
// of ONLY the `unsubscribed`/`unsubscribedAt` fields on newsletterSubscribers.
// Suggested rule (add this in Firebase Console → Firestore → Rules):
//
//   match /newsletterSubscribers/{id} {
//     allow update: if request.resource.data.diff(resource.data).affectedKeys()
//                     .hasOnly(['unsubscribed', 'unsubscribedAt']);
//   }
//
// This does NOT open up the collection generally — it only permits a write
// that touches exactly those two fields, so nothing else on a subscriber
// record (email, subscribedAt, etc.) can be tampered with this way.
export default function NewsletterUnsubscribe() {
  const [params] = useSearchParams()
  const email = params.get('email') || ''
  const [status, setStatus] = useState('loading') // loading | done | error

  useEffect(() => {
    if (!email) { setStatus('error'); return }
    newsletterService.unsubscribe(email)
      .then(() => setStatus('done'))
      .catch(() => setStatus('error'))
  }, [email])

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        {status === 'loading' && <p className="text-gray-400">Unsubscribing…</p>}

        {status === 'done' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5"><CheckCircle size={30} className="text-green-600" /></div>
            <h1 className="text-xl font-black text-[#1a1a1a] mb-2">You've Been Unsubscribed</h1>
            <p className="text-gray-500 text-sm mb-6">{email} will no longer receive MEDWEB newsletter emails.</p>
            <Link to="/" className="inline-block px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1655c3] hover:bg-[#123f8f] transition-colors">Back to Home</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5"><XCircle size={30} className="text-red-400" /></div>
            <h1 className="text-xl font-black text-[#1a1a1a] mb-2">Something Went Wrong</h1>
            <p className="text-gray-500 text-sm">We couldn't process this unsubscribe request. Please try again from the link in your email, or contact us directly.</p>
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
