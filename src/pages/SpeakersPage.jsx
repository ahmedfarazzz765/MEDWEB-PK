import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { webinarsService } from '../firebase/services'
import { deriveSpeakersFromWebinars } from '../lib/speakers'
import { MemberCard } from '../sections/About'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SectionHeading from '../components/SectionHeading'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'

// Speaker roster is derived from webinar records rather than a separate
// admin-maintained list — see src/lib/speakers.js for why. MemberCard
// (same component the Team page uses) already renders exactly the
// photo/name/qualification card shape this page needs, so it's reused
// as-is rather than building a near-identical speaker card.
export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState(null) // null = loading

  useEffect(() => {
    window.scrollTo(0, 0)
    const unsub = webinarsService.listen(webinars => {
      setSpeakers(deriveSpeakersFromWebinars(webinars))
    })
    return unsub
  }, [])

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen flex flex-col justify-between">
      <div>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 pt-10 pb-16">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#1655c3] mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </Link>

          <SectionHeading word1="Our" word2="Speakers" subtitle="The experts and clinicians who've led MEDWEB's webinars." className="mb-10" />

          {speakers === null ? (
            <CardRowSkeleton count={8} cardWidth={280} cardHeight={280} />
          ) : speakers.length === 0 ? (
            <SectionEmptyState message="Speakers will appear here once webinars with a speaker are added in the admin panel." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {speakers.map(s => <MemberCard key={s.name} member={s} />)}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
