import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCat = searchParams.get('category') || 'All'
  const [activeCategory, setActiveCategory] = useState(initialCat)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    const unsub = teamService.listen(rows => {
      const active = rows.filter(r => r.status !== 'Inactive')
      setTeam(active)
    })
    return () => unsub()
  }, [])

  // Synchronize category state when searchParams change
  useEffect(() => {
    const cat = searchParams.get('category') || 'All'
    setActiveCategory(cat)
  }, [searchParams])

  // Extract unique categories from active team members
  const categories = useMemo(() => {
    if (!team) return []
    const catSet = new Set()
    team.forEach(m => {
      if (m.category?.trim()) catSet.add(m.category.trim())
    })
    return Array.from(catSet)
  }, [team])

  // Filter team members based on selected category
  const filteredTeam = useMemo(() => {
    if (!team) return []
    if (activeCategory === 'All') return team
    return team.filter(m => (m.category || 'Executive') === activeCategory)
  }, [team, activeCategory])

  const handleCategoryChange = cat => {
    setActiveCategory(cat)
    setVisibleCount(PAGE_SIZE)
    if (cat === 'All') {
      setSearchParams({})
    } else {
      setSearchParams({ category: cat })
    }
  }

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen flex flex-col justify-between">
      <div>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 pt-10 pb-16">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#1655c3] mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>

          <SectionHeading
            word1="Our"
            word2="Team"
            subtitle="Meet everyone behind the MEDWEB platform."
            className="mb-6"
          />

          {/* Category Filter Tabs */}
          {team && team.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
              <button
                onClick={() => handleCategoryChange('All')}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 shadow-sm ${
                  activeCategory === 'All'
                    ? 'bg-[#64ac37] text-white shadow-green-200 scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                All Members ({team.length})
              </button>
              {categories.map(cat => {
                const count = team.filter(m => (m.category || 'Executive') === cat).length
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 shadow-sm ${
                      activeCategory === cat
                        ? 'bg-[#64ac37] text-white shadow-green-200 scale-105'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                )
              })}
            </div>
          )}

          {team === null ? (
            <CardRowSkeleton count={8} cardWidth={260} cardHeight={340} />
          ) : team.length === 0 ? (
            <SectionEmptyState message="Team members will appear here once added in the admin panel." />
          ) : filteredTeam.length === 0 ? (
            <SectionEmptyState message={`No team members found under category '${activeCategory}'.`} />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {filteredTeam.slice(0, visibleCount).map((member, i) => (
                  <MemberCard key={member.id || i} member={member} />
                ))}
              </div>
              {visibleCount < filteredTeam.length && (
                <div className="text-center mt-10">
                  <button
                    onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                    className="px-7 py-3 rounded-full text-sm font-bold text-[#1655c3] border-2 border-[#1655c3] hover:bg-[#1655c3] hover:text-white transition-all duration-300 shadow-sm"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
