import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import LaunchIntro from '../components/LaunchIntro'
import WelcomeBar from '../sections/WelcomeBar'
import Navbar from '../components/Navbar'
import AnnouncementBanner from '../sections/AnnouncementBanner'
import Hero from '../sections/Hero'
import TrustedPartners from '../sections/TrustedPartners'
import Stats from '../sections/Stats'
import FounderMessage from '../sections/FounderMessage'
import WebinarsSlider from '../sections/WebinarsSlider'
import CoursesHighlight from '../sections/CoursesHighlight'
import WhyMedweb from '../sections/WhyMedweb'
import Testimonials from '../sections/Testimonials'
import Ambassadors from '../sections/Ambassadors'
import CertificateVerification from '../sections/CertificateVerification'
import LatestBlog from '../sections/LatestBlog'
import Footer from '../sections/Footer'
import Team from '../sections/About'
import AdvisoryBoard from '../sections/AdvisoryBoard'
import { sectionVisibilityService, settingsService } from '../firebase/services'

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
      {showIntro && <LaunchIntro onDone={() => setShowIntro(false)} />}
      {v.welcomeBar && <WelcomeBar />}
      <Navbar />
      <AnnouncementBanner />
      {v.hero && <Hero />}
      {v.trustedPartners && <TrustedPartners />}
      {v.stats && <Stats />}
      {v.founderMessage && <FounderMessage />}
      {/* Webinars now appear ABOVE Courses (per requirements) */}
      {v.webinars && <WebinarsSlider />}
      {v.courses && <CoursesHighlight />}
      {v.whyMedweb && <WhyMedweb />}
      {v.testimonials && <Testimonials />}
      {v.team && <Team />}
      {v.advisoryBoard && <AdvisoryBoard />}
      {v.ambassadors && <Ambassadors />}
      {v.certificateVerification && <CertificateVerification />}
      {v.latestBlog && <LatestBlog />}
      {v.footer && <Footer />}
    </div>
  )
}
