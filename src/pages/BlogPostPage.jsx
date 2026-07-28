import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import DOMPurify from 'dompurify'
import { ArrowLeft, User, Calendar } from 'lucide-react'
import { blogService } from '../firebase/services'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import CoverImage from '../components/CoverImage'

export default function BlogPostPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(undefined) // undefined = loading, null = not found, object = found

  useEffect(() => {
    window.scrollTo(0, 0)
    setPost(undefined)
    blogService.getBySlug(slug)
      .then(p => {
        // A Draft's slug must never be reachable by a guessed/old URL —
        // treat it identically to "no post at all" for public visitors.
        setPost(p && p.status === 'Published' ? p : null)
        if (p && p.status === 'Published') blogService.incrementView(p.id).catch(() => {})
      })
      .catch(() => setPost(null))
  }, [slug])

  if (post === undefined) {
    return (
      <div className="font-poppins bg-[#f7f9fc] min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center text-gray-400">Loading article…</div>
        <Footer />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="font-poppins bg-[#f7f9fc] min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-black text-[#1a1a1a] mb-3">Article Not Found</h1>
          <p className="text-gray-500 mb-6">This article may have been removed, unpublished, or the link is incorrect.</p>
          <Link to="/#blog" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-full bg-[#1655c3] hover:bg-[#123f8f] transition-colors">
            <ArrowLeft size={16} /> Back to Blog
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />

      {/* Hero band */}
      <div className="px-4 pt-10 pb-20 sm:pt-14 sm:pb-28" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          {post.category && <span className="inline-block text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full mb-4">{post.category}</span>}
          <h1 className="text-white font-black text-3xl sm:text-4xl lg:text-5xl leading-tight">{post.title}</h1>
          <div className="flex items-center gap-5 mt-4 text-white/85 text-sm flex-wrap">
            {post.author && <span className="flex items-center gap-1.5"><User size={14} /> {post.author}</span>}
            {post.published && <span className="flex items-center gap-1.5"><Calendar size={14} /> {post.published}</span>}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-12 sm:-mt-16 pb-16">
        <motion.div
          className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        >
          {post.imageUrl && (
            <div className="w-full h-56 sm:h-80 overflow-hidden">
              <CoverImage src={post.imageUrl} alt={post.title} className="w-full h-full" onError={e => { e.target.style.display = 'none' }} />
            </div>
          )}

          <div className="p-6 sm:p-10">
            <div
              className="blog-content text-gray-700 text-[15px] sm:text-base leading-[1.85]"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || '') }}
            />
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  )
}
