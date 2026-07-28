import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Star, Users, PlayCircle, Clock, ListChecks } from 'lucide-react'
import { coursesService } from '../firebase/services'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import CoverImage from '../components/CoverImage'

export default function CourseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.scrollTo(0, 0)
    setLoading(true)
    coursesService.getOne(id)
      .then(c => setCourse(c))
      .catch(() => setCourse(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="font-poppins bg-[#f7f9fc] min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center text-gray-400">Loading course…</div>
        <Footer />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="font-poppins bg-[#f7f9fc] min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-black text-[#1a1a1a] mb-3">Course Not Found</h1>
          <p className="text-gray-500 mb-6">This course may have been removed or the link is incorrect.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-full bg-[#1655c3] hover:bg-[#123f8f] transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  const poster = course.posterImage || course.imageUrl
  const lectures = Array.isArray(course.lectures) ? course.lectures : []
  const tags = Array.isArray(course.tags) ? course.tags : []
  const fullDescription = course.fullDescription || course.description
  const instructorInitials = (course.instructor || '?').replace(/^Dr\.?\s*/i, '').split(' ').map(n => n[0]).slice(0, 2).join('')

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />

      {/* Hero band */}
      <div className="px-4 pt-10 pb-20 sm:pt-14 sm:pb-28" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          {course.type && <span className="inline-block text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full mb-4">{course.type}</span>}
          <h1 className="text-white font-black text-3xl sm:text-4xl lg:text-5xl leading-tight">{course.title}</h1>
          <div className="flex items-center gap-4 mt-4 text-white/85 text-sm flex-wrap">
            {course.rating > 0 && <span className="flex items-center gap-1"><Star size={14} className="fill-white" /> {course.rating}</span>}
            {course.students > 0 && <span className="flex items-center gap-1"><Users size={14} /> {Number(course.students).toLocaleString()} students</span>}
            {course.courseDuration && <span className="flex items-center gap-1"><Clock size={14} /> {course.courseDuration}</span>}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((tag, i) => (
                <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12 sm:-mt-16 pb-16">
        <motion.div
          className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        >
          {poster && (
            <div className="w-full h-56 sm:h-72 overflow-hidden">
              <CoverImage src={poster} alt={course.title} className="w-full h-full" onError={e => { e.target.style.display = 'none' }} />
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-6">
            {course.instructor && (
              <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50">
                <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm bg-[#1655c3]">
                  {course.instructorImage
                    ? <CoverImage src={course.instructorImage} alt={course.instructor} bias="center 25%" className="w-full h-full" />
                    : <div className="w-full h-full flex items-center justify-center text-white font-bold text-base">{instructorInitials}</div>}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Instructor</div>
                  <div className="font-bold text-[#1a1a1a] text-sm truncate">{course.instructor}</div>
                  {course.qualification && <div className="text-xs text-gray-500 truncate">{course.qualification}</div>}
                </div>
              </div>
            )}

            {fullDescription && (
              <p className="text-gray-600 text-sm sm:text-[15px] leading-relaxed">{fullDescription}</p>
            )}

            {course.driveLink && (
              <a href={course.driveLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-full bg-[#1655c3] hover:bg-[#123f8f] transition-colors text-sm">
                Open Lecture Materials <ExternalLink size={15} />
              </a>
            )}

            {lectures.length > 0 && (
              <div>
                <h2 className="font-bold text-[#1a1a1a] text-lg mb-4 flex items-center gap-2">
                  <ListChecks size={18} className="text-[#1655c3]" /> Course Outline
                </h2>
                <div className="space-y-3">
                  {lectures.map((l, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1655c3] flex items-center justify-center flex-shrink-0">
                        <PlayCircle size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[#1a1a1a] text-sm">{l.title || `Lecture ${i + 1}`}</div>
                        {l.description && <div className="text-xs text-gray-500 mt-1 leading-relaxed">{l.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {course.whatsapp && (
              <a
                href={`https://wa.me/${String(course.whatsapp).replace(/[^0-9]/g, '').replace(/^0/, '92')}?text=${encodeURIComponent('Assalam o Alaikum, I want to enroll in: ' + (course.title || 'a course'))}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#1655c3] font-semibold border-2 border-[#1655c3] px-6 py-3 rounded-full hover:bg-[#1655c3] hover:text-white transition-colors text-sm"
              >
                Enroll on WhatsApp
              </a>
            )}
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  )
}
