import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SEO from '../components/SEO'

// Catch-all for any unmatched path (<Route path="*"> in App.jsx) — there
// was previously no fallback at all, so an unknown URL just rendered
// blank. noindex so search engines don't index this as real content;
// the real HTTP 404 status for a genuinely nonexistent path comes from
// public/.htaccess's ErrorDocument 404 directive, not from this component
// (a client-side React page can't set the HTTP status code itself).
export default function NotFoundPage() {
  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen flex flex-col">
      <SEO title="Page Not Found" description="This page doesn't exist." noindex />
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-24 text-center">
        <div>
          <h1 className="text-6xl font-black text-[#1655c3] mb-3">404</h1>
          <h2 className="text-xl font-black text-[#1a1a1a] mb-2">Page Not Found</h2>
          <p className="text-gray-500 mb-6 max-w-md">The page you're looking for doesn't exist or may have moved.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-full bg-[#1655c3] hover:bg-[#123f8f] transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}
