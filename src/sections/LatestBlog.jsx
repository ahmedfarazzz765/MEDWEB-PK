import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock, User } from 'lucide-react'
import { blogService } from '../firebase/services'
import { useSiteSettings } from '../hooks/useSiteSettings'
import SectionHeading from '../components/SectionHeading'
import InfiniteMarquee from '../components/InfiniteMarquee'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'
import BrandWatermark from '../components/BrandWatermark'
import CoverImage from '../components/CoverImage'

const HEADING_DEFAULTS = { blogHeading1: 'Latest', blogHeading2: 'Articles' }
const COLORS = ['#1655c3','#64ac37','#2563eb']

export function BlogCard({ post, i }) {
  return (
    <article className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group h-full">
      <div className="aspect-video overflow-hidden relative" style={{ background:`linear-gradient(135deg, ${COLORS[i%COLORS.length]}12, ${COLORS[i%COLORS.length]}06)` }}>
        {post.imageUrl
          ? <CoverImage src={post.imageUrl} alt={post.title} className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl font-black opacity-10" style={{ color:COLORS[i%COLORS.length] }}>{post.category?.charAt(0)||'M'}</span>
            </div>
        }
        <span className="absolute top-4 left-4 text-[10px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background:COLORS[i%COLORS.length] }}>
          {post.category || 'Medical'}
        </span>
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
          <span className="flex items-center gap-1"><User size={11}/> {post.author || 'MEDWEB'}</span>
          {post.views > 0 && <span className="flex items-center gap-1"><Clock size={11}/> {Number(post.views).toLocaleString()} views</span>}
        </div>
        <h3 className="font-bold text-[#1a1a1a] text-sm sm:text-base leading-snug mb-3 group-hover:text-[#1655c3] transition-colors line-clamp-2">{post.title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed mb-5 line-clamp-3">{post.excerpt}</p>
        {post.slug ? (
          <Link to={`/blog/${post.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold group-hover:gap-3 transition-all duration-200" style={{ color:COLORS[i%COLORS.length] }}>
            Read More <ArrowRight size={14} />
          </Link>
        ) : (
          // Old post not yet backfilled with a slug (see AdminBlog.jsx) —
          // falls back to the full articles list instead of a dead anchor.
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold group-hover:gap-3 transition-all duration-200" style={{ color:COLORS[i%COLORS.length] }}>
            Read More <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </article>
  )
}

export default function LatestBlog() {
  const [posts, setPosts] = useState(null) // null = still loading; [] = confirmed empty
  const h = useSiteSettings(HEADING_DEFAULTS)

  useEffect(() => {
    const unsub = blogService.listen(rows => {
      const published = rows.filter(r => r.status === 'Published')
      setPosts(published)
    })
    return () => unsub()
  }, [])

  return (
    <section id="blog" className="py-10 sm:py-12 px-4 bg-white relative overflow-hidden">
      <BrandWatermark seed={9} />
      <div className="max-w-7xl mx-auto relative z-10">
        <SectionHeading word1={h.blogHeading1} word2={h.blogHeading2} className="mb-4" />
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/blog" className="inline-flex items-center gap-2 text-[#1655c3] font-semibold text-sm hover:gap-3 transition-all duration-200">
            See All <ArrowRight size={15} />
          </Link>
        </div>

        {posts === null ? (
          <CardRowSkeleton count={3} cardWidth={320} cardHeight={340} gap={24} />
        ) : posts.length === 0 ? (
          <SectionEmptyState message="Articles will appear here once published in the admin panel." />
        ) : (
          <InfiniteMarquee
            items={posts}
            pauseOnHover
            showNav
            gap={24}
            itemClassName="w-[300px] sm:w-[340px]"
            keyFn={(post, i) => post.id || i}
            renderItem={(post, i) => <BlogCard post={post} i={i} />}
          />
        )}
      </div>
    </section>
  )
}
