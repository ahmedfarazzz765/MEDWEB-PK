import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { teamService, teamCategoriesService } from '../firebase/services'
import { MemberCard, WhyMedwebCategoryCard } from '../sections/About'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SectionHeading from '../components/SectionHeading'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'

const PAGE_SIZE = 16

export default function TeamListPage() {
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [dbCategories, setDbCategories] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCat = searchParams.get('category') || 'All'
  const [activeCategory, setActiveCategory] = useState(initialCat)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    const unsubTeam = teamService.listen(rows => {
      const active = rows.filter(r => r.status !== 'Inactive')
      setTeam(active)
    })
    const unsubCats = teamCategoriesService.listen(cats => {
      setDbCategories(cats)
    })
    return () => {
      unsubTeam()
      unsubCats()
    }
  }, [])

  // Synchronize category state when searchParams change
  useEffect(() => {
    const cat = searchParams.get('category') || 'All'
    setActiveCategory(cat)
  }, [searchParams])

  // Renders exactly what's in Firestore — no default-template fallback
  // (see About.jsx's categoryCards for why: merging in defaults here made
  // Admin-deleted category cards keep reappearing regardless of Firestore state).
  const categoryCards = dbCategories
  const activeCategoryObj = categoryCards.find(c => c.name === activeCategory)
  const showApply = activeCategoryObj?.applyEnabled && activeCategoryObj?.applyFormId

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

          {activeCategory === 'All' ? (
            /* ─── DEFAULT VIEW: Category Cards Grid (same style as homepage) ─── */
            team === null ? (
              <CardRowSkeleton count={8} cardWidth={280} cardHeight={280} />
            ) : team.length === 0 ? (
              <SectionEmptyState message="Team members will appear here once added in the admin panel." />
            ) : (
              <div className="flex flex-wrap justify-center gap-6">
                {categoryCards.map((cat, i) => {
                  const count = team.filter(m => (m.category || 'Chief Executive').toLowerCase() === cat.name.toLowerCase()).length
                  return (
                    <WhyMedwebCategoryCard
                      key={cat.id || cat.name || i}
                      category={cat}
                      memberCount={count}
                      onSelect={handleCategoryChange}
                    />
                  )
                })}
              </div>
            )
          ) : (
            /* ─── FILTERED VIEW: Members of the selected category ─── */
            <>
              <div className="flex items-center justify-between mb-6 max-w-6xl mx-auto">
                <button
                  onClick={() => handleCategoryChange('All')}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#1655c3] transition-colors"
                >
                  <ArrowLeft size={16} /> Back to Categories
                </button>
                <span className="text-sm font-bold text-[#1a1a1a]">{activeCategory} ({filteredTeam.length})</span>
              </div>

              {showApply && (
                <div className="max-w-6xl mx-auto mb-6 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
                  <p className="text-white text-sm font-semibold">Interested in joining {activeCategory}? Applications are open.</p>
                  <button
                    onClick={() => navigate(`/form/${activeCategoryObj.applyFormId}`)}
                    className="inline-flex items-center gap-2 bg-white text-[#1655c3] text-sm font-bold px-5 py-2.5 rounded-xl hover:gap-3 transition-all shrink-0"
                  >
                    Apply Now <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {filteredTeam.length === 0 ? (
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
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
