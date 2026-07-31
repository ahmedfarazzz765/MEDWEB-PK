import { motion } from 'framer-motion'
import DOMPurify from 'dompurify'
import { User, Calendar } from 'lucide-react'
import CoverImage from './CoverImage'

// The actual rendered body of a blog post — hero band + white content card.
// Shared between the public post page (BlogPostPage.jsx) and the admin
// blog editor's Preview mode, so "preview" is never an approximation of
// the real page, it's the literal same markup/classes. `topLeft` is an
// optional slot inside the hero band for page-specific chrome (BlogPostPage's
// "Back" button) that doesn't belong in a reusable preview component itself.
export default function PostArticleView({ post, topLeft }) {
  return (
    <div className="font-poppins bg-[#f7f9fc]">
      <div className="px-4 pt-10 pb-20 sm:pt-14 sm:pb-28" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
        <div className="max-w-3xl mx-auto">
          {topLeft}
          {post.category && <span className="inline-block text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full mb-4">{post.category}</span>}
          <h1 className="text-white font-black text-3xl sm:text-4xl lg:text-5xl leading-tight">{post.title || 'Untitled Post'}</h1>
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
    </div>
  )
}
