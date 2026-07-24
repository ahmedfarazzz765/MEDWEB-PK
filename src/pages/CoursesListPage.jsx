import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { coursesService } from '../firebase/services'
import { CourseCard } from '../sections/CoursesHighlight'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SectionHeading from '../components/SectionHeading'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'

const PAGE_SIZE = 12

export default function CoursesListPage() {
  const [courses, setCourses] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    const unsub = coursesService.listen(rows => {
      // Full catalog — not narrowed to "featured" like the homepage teaser,
      // since "See All Courses" should mean the complete list.
      const visible = rows.filter(r => !['Inactive', 'Draft', 'Hidden', 'Archived'].includes(r.status))
      setCourses(visible.length > 0 ? visible : rows)
    })
    return () => unsub()
  }, [])

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1655c3] mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <SectionHeading word1="All" word2="Courses" subtitle="The complete MEDWEB course catalog." className="mb-10" />

        {courses === null ? (
          <CardRowSkeleton count={6} cardWidth={300} cardHeight={340} />
        ) : courses.length === 0 ? (
          <SectionEmptyState message="Courses will appear here once added in the admin panel." />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.slice(0, visibleCount).map((c, i) => (
                <CourseCard key={c.id || i} c={c} i={i} />
              ))}
            </div>
            {visibleCount < courses.length && (
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
