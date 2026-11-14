import { useEffect, useState, lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import LaunchIntro from '../components/LaunchIntro'
import WelcomeBar from '../sections/WelcomeBar'
import Navbar from '../components/Navbar'
import AnnouncementTicker from '../sections/AnnouncementTicker'
import Hero from '../sections/Hero'
import { sectionVisibilityService, settingsService } from '../firebase/services'
import SEO, { SITE_NAME, SITE_URL, DEFAULT_IMAGE } from '../components/SEO'

// Everything below the fold is code-split — Hero is the only section a
// visitor sees without scrolling, so it's the only one that needs to be
// in the initial bundle. Each gets its own Suspense boundary (not one
// shared one) so they resolve independently instead of all waiting on
// the slowest chunk; fallback={null} since every one of these already
// shows its own internal skeleton once its JS has loaded and it starts
// fetching its own Firestore data — this only covers the brief moment
// the chunk itself is still downloading.
const TrustedPartners = lazy(() => import('../sections/TrustedPartners'))
const Stats = lazy(() => import('../sections/Stats'))
const FounderMessage = lazy(() => import('../sections/FounderMessage'))
const WebinarsSlider = lazy(() => import('../sections/WebinarsSlider'))
const CoursesHighlight = lazy(() => import('../sections/CoursesHighlight'))
const WhyMedweb = lazy(() => import('../sections/WhyMedweb'))
const Testimonials = lazy(() => import('../sections/Testimonials'))
const Team = lazy(() => import('../sections/About'))
const AdvisoryBoard = lazy(() => import('../sections/AdvisoryBoard'))
const Ambassadors = lazy(() => import('../sections/Ambassadors'))
const CertificateVerification = lazy(() => import('../sections/CertificateVerification'))
const LatestBlog = lazy(() => import('../sections/LatestBlog'))
const LatestEvents = lazy(() => import('../sections/LatestEvents'))
const Footer = lazy(() => import('../sections/Footer'))

const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: DEFAULT_IMAGE,
  description: "Pakistan's medical education platform — live webinars, expert-designed courses, verified certificates, and a nationwide student ambassador network for healthcare students.",
  sameAs: [], // admin-configured social links already shown in the footer — not a fixed list worth hardcoding here
}

// Missing doc/field = visible. Only an explicit `false` hides a section —
// see services.js for the full rationale.
const DEFAULT_VISIBILITY = {
  welcomeBar: true, hero: true, trustedPartners: true, stats: true,
  founderMessage: true, webinars: true, courses: true, whyMedweb: true,
  testimonials: true, team: true, advisoryBoard: true, ambassadors: true,
  certificateVerification: true, latestBlog: true, footer: true,
}

export default function HomePage() {
  const [v, setV] = useState(DEFAULT_VISIBILITY)
  const [showIntro, setShowIntro] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const unsub = sectionVisibilityService.listen(s => {
      if (!s) return
      setV(prev => ({ ...prev, ...s }))
    })
    return () => unsub && unsub()
  }, [])

  // One-shot check on load — the intro only plays while the site owner has
  // it switched on (Admin Panel → Homepage Sections → Launch Intro
  // Animation), a single boolean on the shared settings/site doc.
  useEffect(() => {
    settingsService.get().then(s => {
      if (s?.launchIntroEnabled) setShowIntro(true)
    }).catch(() => {})
  }, [])

  // Reached via a Navbar/Footer link clicked from a DIFFERENT page (e.g.
  // "Courses" clicked while on /blog/some-post) — Navbar routes here as
  // "/#courses" instead of doing a same-page anchor jump, since the section
  // doesn't exist on the page the click originated from. Every section's id
  // is present on mount regardless of its own data still loading, so one
  // paint cycle is enough to have something to scroll to.
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const raf = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [location])

  return (
    <div className="font-poppins">
      <SEO path="/" jsonLd={ORGANIZATION_JSON_LD} />
      {showIntro && <LaunchIntro onDone={() => setShowIntro(false)} />}
      {v.welcomeBar && <WelcomeBar />}
      <Navbar />
      <AnnouncementTicker />
      {v.hero && <Hero />}
      {v.trustedPartners && <Suspense fallback={null}><TrustedPartners /></Suspense>}
      {v.stats && <Suspense fallback={null}><Stats /></Suspense>}
      {v.founderMessage && <Suspense fallback={null}><FounderMessage /></Suspense>}
      {/* Webinars now appear ABOVE Courses (per requirements) */}
      {v.webinars && <Suspense fallback={null}><WebinarsSlider /></Suspense>}
      {v.courses && <Suspense fallback={null}><CoursesHighlight /></Suspense>}
      {v.whyMedweb && <Suspense fallback={null}><WhyMedweb /></Suspense>}
      {v.testimonials && <Suspense fallback={null}><Testimonials /></Suspense>}
      {v.team && <Suspense fallback={null}><Team /></Suspense>}
      {v.advisoryBoard && <Suspense fallback={null}><AdvisoryBoard /></Suspense>}
      {v.ambassadors && <Suspense fallback={null}><Ambassadors /></Suspense>}
      {v.certificateVerification && <Suspense fallback={null}><CertificateVerification /></Suspense>}
      {v.latestBlog && <Suspense fallback={null}><LatestBlog /></Suspense>}
      <Suspense fallback={null}><LatestEvents /></Suspense>
      {v.footer && <Suspense fallback={null}><Footer /></Suspense>}
    </div>
  )
}
