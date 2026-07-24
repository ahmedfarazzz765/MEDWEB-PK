import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ambassadorsService } from '../firebase/services'
import { AmbassadorCard } from '../sections/Ambassadors'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SectionHeading from '../components/SectionHeading'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'

const PAGE_SIZE = 16

export default function AmbassadorsListPage() {
  const [ambassadors, setAmbassadors] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    const unsub = ambassadorsService.listen(rows => setAmbassadors(rows.filter(r => r.status === 'Active')))
    return () => unsub()
  }, [])

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1655c3] mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <SectionHeading word1="All" word2="Ambassadors" subtitle="Our full network of student leaders representing MEDWEB across Pakistan." className="mb-10" />

        {ambassadors === null ? (
          <CardRowSkeleton count={8} cardWidth={260} cardHeight={320} />
        ) : ambassadors.length === 0 ? (
          <SectionEmptyState message="Ambassadors will appear here once added in the admin panel." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {ambassadors.slice(0, visibleCount).map((a, i) => (
                <AmbassadorCard key={a.id || i} a={a} />
              ))}
            </div>
            {visibleCount < ambassadors.length && (
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
