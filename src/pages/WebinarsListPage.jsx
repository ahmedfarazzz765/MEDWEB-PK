import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { webinarsService } from '../firebase/services'
import { WebinarCard, sortWebinars } from '../sections/WebinarsSlider'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SectionHeading from '../components/SectionHeading'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'

const PAGE_SIZE = 12

export default function WebinarsListPage() {
  const navigate = useNavigate()
  const [webinars, setWebinars] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    const unsub = webinarsService.listen(rows => setWebinars(sortWebinars(rows)))
    return () => unsub()
  }, [])

  const handleRegister = webinar => {
    if (webinar._feedbackMode && webinar.feedbackFormId) { navigate(`/form/${webinar.feedbackFormId}`); return }
    if (webinar.registrationLink) { window.open(webinar.registrationLink, '_blank', 'noopener,noreferrer'); return }
    if (webinar.isStatic) navigate('/webinar/static/register')
    else navigate(`/webinar/${webinar.id}/register`)
  }

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1655c3] mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <SectionHeading word1="All" word2="Webinars" subtitle="Every session MEDWEB has hosted — live, upcoming, and recorded." className="mb-10" />

        {webinars === null ? (
          <CardRowSkeleton count={6} cardWidth={320} cardHeight={380} gap={24} />
        ) : webinars.length === 0 ? (
          <SectionEmptyState message="Webinars will appear here once scheduled in the admin panel." />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {webinars.slice(0, visibleCount).map(w => (
                <WebinarCard key={w.id} webinar={w} onRegister={handleRegister} />
              ))}
            </div>
            {visibleCount < webinars.length && (
              <div className="text-center mt-10">
                <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                  className="px-7 py-3 rounded-full text-sm font-bold text-[#1655c3] border-2 border-[#1655c3] hover:bg-[#1655c3] hover:text-white transition-all duration-300">
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
