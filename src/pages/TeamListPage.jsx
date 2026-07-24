import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { teamService } from '../firebase/services'
import { MemberCard } from '../sections/About'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SectionHeading from '../components/SectionHeading'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'

const PAGE_SIZE = 16

export default function TeamListPage() {
  const [team, setTeam] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    const unsub = teamService.listen(rows => setTeam(rows.filter(r => r.status !== 'Inactive')))
    return () => unsub()
  }, [])

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1655c3] mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <SectionHeading word1="Our" word2="Team" subtitle="Meet everyone behind the MEDWEB platform." className="mb-10" />

        {team === null ? (
          <CardRowSkeleton count={8} cardWidth={260} cardHeight={340} />
        ) : team.length === 0 ? (
          <SectionEmptyState message="Team members will appear here once added in the admin panel." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {team.slice(0, visibleCount).map((member, i) => (
                <MemberCard key={member.id || i} member={member} />
              ))}
            </div>
            {visibleCount < team.length && (
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
