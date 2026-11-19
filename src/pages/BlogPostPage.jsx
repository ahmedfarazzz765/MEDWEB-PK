import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { blogService } from '../firebase/services'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import PostArticleView from '../components/PostArticleView'
import SEO, { SITE_URL, DEFAULT_IMAGE } from '../components/SEO'

// Firestore Timestamp (has .toDate()) | ISO/plain date string | undefined -> ISO string | undefined
function toIso(value) {
  if (!value) return undefined
  if (typeof value?.toDate === 'function') return value.toDate().toISOString()
  const d = new Date(value)
  return isNaN(d.getTime()) ? undefined : d.toISOString()
}

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

  const canonicalPath = `/blog/${slug}`
  const datePublished = toIso(post.published) || toIso(post.createdAt)
  const dateModified = toIso(post.updatedAt) || datePublished

  const blogPostingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    image: post.imageUrl ? [post.imageUrl] : [DEFAULT_IMAGE],
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    author: post.authorName
      ? { '@type': 'Person', name: post.authorName }
      : { '@type': 'Organization', name: 'MEDWEB-PK' },
    publisher: {
      '@type': 'Organization',
      name: 'MEDWEB-PK',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}${canonicalPath}` },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}${canonicalPath}` },
    ],
  }

  return (
    <div className="min-h-screen">
      <SEO
        title={post.title}
        description={post.excerpt}
        path={canonicalPath}
        image={post.imageUrl}
        type="article"
        jsonLd={[blogPostingJsonLd, breadcrumbJsonLd]}
      />
      <Navbar />
      <PostArticleView
        post={post}
        topLeft={
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
        }
      />
      <Footer />
    </div>
  )
}
