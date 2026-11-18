import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import PageLoader from './components/PageLoader'
import WebinarAnnouncementPopup from './components/WebinarAnnouncementPopup'
import NewsPopup from './components/NewsPopup'
import CoursePopup from './components/CoursePopup'

// Every route is code-split via React.lazy — previously every page
// (including the entire /admin area: ~20 admin pages pulling in xlsx,
// jspdf, html2canvas, Tiptap, dnd-kit, and the whole Ambassador
// dashboard) was bundled into one ~2.8MB main chunk regardless of
// whether a visitor ever opens /admin. Each import() below becomes its
// own chunk, fetched only when that route is actually visited.
const HomePage              = lazy(() => import('./pages/HomePage'))
const WebinarRegister       = lazy(() => import('./pages/WebinarRegister'))
const MockTestPage          = lazy(() => import('./pages/MockTestPage'))
const WebinarDetailPage     = lazy(() => import('./pages/WebinarDetailPage'))
const FounderMessagePage    = lazy(() => import('./pages/FounderMessagePage'))
const AboutPage             = lazy(() => import('./pages/AboutPage'))
const CertificatePage       = lazy(() => import('./pages/CertificatePage'))
const PortfolioPage         = lazy(() => import('./pages/PortfolioPage'))
const CourseDetailPage      = lazy(() => import('./pages/CourseDetailPage'))
const AmbassadorProfilePage = lazy(() => import('./pages/AmbassadorProfilePage'))
const BlogPostPage          = lazy(() => import('./pages/BlogPostPage'))
const AnnouncementPage      = lazy(() => import('./pages/AnnouncementPage'))
const AnnouncementsListPage = lazy(() => import('./pages/AnnouncementsListPage'))
const WebinarsListPage      = lazy(() => import('./pages/WebinarsListPage'))
const CoursesListPage       = lazy(() => import('./pages/CoursesListPage'))
const TeamListPage          = lazy(() => import('./pages/TeamListPage'))
const SpeakersPage          = lazy(() => import('./pages/SpeakersPage'))
const AmbassadorsListPage   = lazy(() => import('./pages/AmbassadorsListPage'))
const AdvisoryBoardListPage = lazy(() => import('./pages/AdvisoryBoardListPage'))
const BlogListPage          = lazy(() => import('./pages/BlogListPage'))
const EventsListPage        = lazy(() => import('./pages/EventsListPage'))
const EventPage             = lazy(() => import('./pages/EventPage'))
const PrivacyPolicyPage     = lazy(() => import('./pages/PrivacyPolicyPage'))
const TermsOfServicePage    = lazy(() => import('./pages/TermsOfServicePage'))
const RefundPolicyPage      = lazy(() => import('./pages/RefundPolicyPage'))
const DynamicForm           = lazy(() => import('./pages/DynamicForm'))
const AcceptInvite          = lazy(() => import('./pages/AcceptInvite'))
const NewsletterUnsubscribe = lazy(() => import('./pages/NewsletterUnsubscribe'))
const NotFoundPage          = lazy(() => import('./pages/NotFoundPage'))

// Admin — the single biggest chunk by far (every AdminXxx page, Form
// Builder's dnd-kit, the Tiptap rich-text editor, xlsx/jspdf/html2canvas
// exports). RequireAuth itself is tiny, but it only ever renders inside
// an admin route, so it travels in the same chunk rather than the main one.
const AdminLogin  = lazy(() => import('./admin/AdminLogin'))
const AdminPanel  = lazy(() => import('./admin/AdminPanel'))
const RequireAuth = lazy(() => import('./admin/RequireAuth'))
// Dev-only visual-QA harness (Round 15 F) — the import.meta.env.DEV check
// is a compile-time constant Vite/Rollup resolves at build time, so this
// entire lazy()+dynamic-import() call (and the chunk it would pull in) is
// dead-code-eliminated from a production build, not just hidden behind a
// runtime check.
const AdminPreview = import.meta.env.DEV ? lazy(() => import('./admin/AdminPreview')) : null

// Ambassador dashboard area — a second, smaller admin-like area most
// visitors never open.
const AmbassadorAcceptInvite  = lazy(() => import('./pages/AmbassadorAcceptInvite'))
const AmbassadorLogin         = lazy(() => import('./pages/AmbassadorLogin'))
const AmbassadorDashboard     = lazy(() => import('./pages/AmbassadorDashboard'))
const RequireAmbassadorAuth   = lazy(() => import('./ambassador/RequireAmbassadorAuth'))
const ComingSoonPage          = lazy(() => import('./ambassador/ComingSoonPage'))

// /news/:slug → /events/:slug — same slug, just carried over to the new
// path (the `news` Firestore collection itself didn't move, only the
// public route did).
function NewsSlugRedirect() {
  const { slug } = useParams()
  return <Navigate to={`/events/${slug}`} replace />
}

// Marketing popups belong on the public site only — mounting them
// unconditionally at the Router root meant refreshing any /admin page
// (including while signed in) showed the same webinar/news popup a
// regular visitor would see. Gated here instead of inside each popup so
// their own Firestore listeners never even start on admin routes.
function PublicSitePopups() {
  const location = useLocation()
  if (location.pathname.startsWith('/admin')) return null
  return (
    <>
      <WebinarAnnouncementPopup />
      <NewsPopup />
      <CoursePopup />
    </>
  )
}

function App() {
  return (
    <Router>
      <PublicSitePopups />
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* "Contact" everywhere else in the app (navbar/footer) is really
            just the homepage's own Footer contact section (#contact) —
            there was never a dedicated page, so a direct hit on the bare
            path (someone typing it, an indexed URL, etc.) matched no
            route and rendered blank. Redirects to the real anchor instead
            of leaving that URL dead. */}
        <Route path="/contact"                element={<Navigate to="/#contact" replace />} />
        <Route path="/"                       element={<HomePage />} />
        <Route path="/founder-message"        element={<FounderMessagePage />} />
        <Route path="/about"                  element={<AboutPage />} />
        <Route path="/certificate/:code"      element={<CertificatePage />} />
        <Route path="/portfolio/:slug"        element={<PortfolioPage />} />
        <Route path="/webinars"               element={<WebinarsListPage />} />
        <Route path="/courses"                element={<CoursesListPage />} />
        <Route path="/courses/:id"            element={<CourseDetailPage />} />
        <Route path="/mock-test/:courseSlug"  element={<MockTestPage />} />
        <Route path="/team"                   element={<TeamListPage />} />
        <Route path="/speakers"               element={<SpeakersPage />} />
        <Route path="/ambassadors"            element={<AmbassadorsListPage />} />
        <Route path="/ambassadors/:id"        element={<AmbassadorProfilePage />} />
        <Route path="/advisory-board"         element={<AdvisoryBoardListPage />} />
        <Route path="/blog"                   element={<BlogListPage />} />
        <Route path="/blog/:slug"             element={<BlogPostPage />} />
        <Route path="/events"                 element={<EventsListPage />} />
        <Route path="/events/:slug"           element={<EventPage />} />
        {/* News module became Events & News this round — old /news links
            (shared, indexed, bookmarked) still resolve, just via a redirect
            instead of their own page. */}
        <Route path="/news"                   element={<Navigate to="/events" replace />} />
        <Route path="/news/:slug"             element={<NewsSlugRedirect />} />
        <Route path="/announcements"          element={<AnnouncementsListPage />} />
        <Route path="/announcements/:slug"    element={<AnnouncementPage />} />
        <Route path="/privacy-policy"         element={<PrivacyPolicyPage />} />
        <Route path="/terms-of-service"       element={<TermsOfServicePage />} />
        <Route path="/refund-policy"          element={<RefundPolicyPage />} />
        <Route path="/webinar/:id"            element={<WebinarDetailPage />} />
        <Route path="/webinar/:id/register"   element={<WebinarRegister />} />
        <Route path="/webinar/static/register" element={<WebinarRegister />} />
        <Route path="/form/:id"               element={<DynamicForm />} />
        <Route path="/unsubscribe"            element={<NewsletterUnsubscribe />} />
        <Route path="/admin/invite/:token"    element={<AcceptInvite />} />
        <Route path="/admin/login"            element={<AdminLogin />} />
        <Route path="/admin"                  element={<RequireAuth><AdminPanel /></RequireAuth>} />
        {import.meta.env.DEV && <Route path="/admin/__preview" element={<AdminPreview />} />}
        <Route path="/admin/*"                element={<RequireAuth><AdminPanel /></RequireAuth>} />
        <Route path="/ambassador/invite/:token" element={<AmbassadorAcceptInvite />} />
        <Route path="/ambassador/login"       element={<AmbassadorLogin />} />
        <Route path="/ambassador/dashboard"   element={<RequireAmbassadorAuth><AmbassadorDashboard /></RequireAmbassadorAuth>} />
        <Route path="/ambassador/profile"        element={<RequireAmbassadorAuth><ComingSoonPage navKey="profile" /></RequireAmbassadorAuth>} />
        <Route path="/ambassador/card"           element={<RequireAmbassadorAuth><ComingSoonPage navKey="card" /></RequireAmbassadorAuth>} />
        <Route path="/ambassador/referral-link"  element={<RequireAmbassadorAuth><ComingSoonPage navKey="referral-link" /></RequireAmbassadorAuth>} />
        <Route path="/ambassador/referrals"      element={<RequireAmbassadorAuth><ComingSoonPage navKey="referrals" /></RequireAmbassadorAuth>} />
        <Route path="/ambassador/rewards"        element={<RequireAmbassadorAuth><ComingSoonPage navKey="rewards" /></RequireAmbassadorAuth>} />
        <Route path="/ambassador/help"           element={<RequireAmbassadorAuth><ComingSoonPage navKey="help" /></RequireAmbassadorAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </Router>
  )
}

export default App
