import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { advisoryService } from '../firebase/services'
import { AdvisorCard } from '../sections/AdvisoryBoard'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SectionHeading from '../components/SectionHeading'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'

const PAGE_SIZE = 16

export default function AdvisoryBoardListPage() {
  const [board, setBoard] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    const unsub = advisoryService.listen(rows => setBoard(rows.filter(r => r.status !== 'Inactive')))
    return () => unsub()
  }, [])

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1655c3] mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <SectionHeading word1="Advisory" word2="Board" subtitle="Distinguished advisors guiding MEDWEB's vision." className="mb-10" />

        {board === null ? (
          <CardRowSkeleton count={8} cardWidth={260} cardHeight={340} />
        ) : board.length === 0 ? (
          <SectionEmptyState message="Advisory board members will appear here once added in the admin panel." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {board.slice(0, visibleCount).map((member, i) => (
                <AdvisorCard key={member.id || i} member={member} />
              ))}
            </div>
            {visibleCount < board.length && (
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
