import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { blogService, blogCategoriesService } from '../firebase/services'
import { DEFAULT_BLOG_CATEGORIES } from '../constants/blogCategories'
import { BlogCard } from '../sections/LatestBlog'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SectionHeading from '../components/SectionHeading'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'

const PAGE_SIZE = 12

export default function BlogListPage() {
  const [posts, setPosts] = useState(null)
  const [dbCategories, setDbCategories] = useState([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const unsub = blogService.listen(rows => setPosts(rows.filter(r => r.status === 'Published')))
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = blogCategoriesService.listen(setDbCategories)
    return () => unsub && unsub()
  }, [])

  // Baseline categories + admin-created ones, deduped — same merge used
  // everywhere else categories are read (Navbar dropdown, Admin dropdown).
  const allCategories = useMemo(() => {
    const set = new Set(DEFAULT_BLOG_CATEGORIES)
    dbCategories.forEach(c => { if (c.name?.trim()) set.add(c.name.trim()) })
    if (posts) posts.forEach(p => { if (p.category?.trim()) set.add(p.category.trim()) })
    return Array.from(set)
  }, [dbCategories, posts])

  // Selected categories live in the URL (?category=A,B) so a Navbar dropdown
  // click or a shared link arrives pre-filtered.
  const selected = useMemo(() => {
    const raw = searchParams.get('category')
    return raw ? new Set(raw.split(',').map(s => s.trim()).filter(Boolean)) : new Set()
  }, [searchParams])

  const toggleCategory = cat => {
    setVisibleCount(PAGE_SIZE)
    const next = new Set(selected)
    if (next.has(cat)) next.delete(cat)
    else next.add(cat)
    if (next.size === 0) setSearchParams({})
    else setSearchParams({ category: Array.from(next).join(',') })
  }

  const clearFilters = () => {
    setVisibleCount(PAGE_SIZE)
    setSearchParams({})
  }

  const filteredPosts = useMemo(() => {
    if (!posts) return []
    if (selected.size === 0) return posts
    return posts.filter(p => selected.has((p.category || '').trim()))
  }, [posts, selected])

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1655c3] mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <SectionHeading word1="All" word2="Articles" subtitle="Every article MEDWEB has published." className="mb-8" />

        {allCategories.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {allCategories.map(cat => {
              const active = selected.has(cat)
              return (
                <label
                  key={cat}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all duration-200 border ${
                    active
                      ? 'bg-[#1655c3] text-white border-[#1655c3] shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#1655c3]/40 hover:text-[#1655c3]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleCategory(cat)}
                    className="hidden"
                  />
                  {cat}
                </label>
              )
            })}
            {selected.size > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {posts === null ? (
          <CardRowSkeleton count={6} cardWidth={320} cardHeight={360} gap={24} />
        ) : posts.length === 0 ? (
          <SectionEmptyState message="Articles will appear here once published in the admin panel." />
        ) : filteredPosts.length === 0 ? (
          <SectionEmptyState message="No articles found in the selected categories." />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.slice(0, visibleCount).map((post, i) => (
                <BlogCard key={post.id || i} post={post} i={i} />
              ))}
            </div>
            {visibleCount < filteredPosts.length && (
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
