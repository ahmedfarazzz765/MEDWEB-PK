import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-react'
import { newsService } from '../firebase/services'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SectionHeading from '../components/SectionHeading'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'
import CoverImage from '../components/CoverImage'

const PAGE_SIZE = 12

export function NewsCard({ item }) {
  return (
    <article className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group h-full flex flex-col">
      <div className="aspect-video overflow-hidden relative bg-blue-50">
        {item.imageUrl
          ? <CoverImage src={item.imageUrl} alt={item.title} className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl font-black opacity-10 text-[#1655c3]">N</span>
            </div>
        }
      </div>
      <div className="p-5 flex-1 flex flex-col">
        {item.published && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            <Calendar size={11} /> {item.published}
          </span>
        )}
        <h3 className="font-bold text-[#1a1a1a] text-sm sm:text-base leading-snug mb-3 group-hover:text-[#1655c3] transition-colors line-clamp-2">{item.title}</h3>
        <div className="mt-auto pt-1">
          {item.slug ? (
            <Link to={`/news/${item.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1655c3] group-hover:gap-3 transition-all duration-200">
              Read More <ArrowRight size={14} />
            </Link>
          ) : (
            <Link to="/news" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1655c3] group-hover:gap-3 transition-all duration-200">
              Read More <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

export default function NewsListPage() {
  const [items, setItems] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    const unsub = newsService.listen(rows => setItems(rows.filter(r => r.status === 'Published')))
    return () => unsub()
  }, [])

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1655c3] mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <SectionHeading word1="Medical" word2="News" subtitle="Curated medical news, properly sourced and referenced." className="mb-10" />

        {items === null ? (
          <CardRowSkeleton count={6} cardWidth={320} cardHeight={320} gap={24} />
        ) : items.length === 0 ? (
          <SectionEmptyState message="News items will appear here once published in the admin panel." />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.slice(0, visibleCount).map((item, i) => (
                <NewsCard key={item.id || i} item={item} />
              ))}
            </div>
            {visibleCount < items.length && (
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
