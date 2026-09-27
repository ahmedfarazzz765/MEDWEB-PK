import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import HomePage          from './pages/HomePage'
import WebinarRegister   from './pages/WebinarRegister'
import WebinarDetailPage from './pages/WebinarDetailPage'
import FounderMessagePage from './pages/FounderMessagePage'
import AboutPage          from './pages/AboutPage'
import CertificatePage    from './pages/CertificatePage'
import PortfolioPage      from './pages/PortfolioPage'
import CourseDetailPage   from './pages/CourseDetailPage'
import AmbassadorProfilePage from './pages/AmbassadorProfilePage'
import BlogPostPage       from './pages/BlogPostPage'
import AnnouncementPage   from './pages/AnnouncementPage'
import AnnouncementsListPage from './pages/AnnouncementsListPage'
import WebinarsListPage   from './pages/WebinarsListPage'
import CoursesListPage    from './pages/CoursesListPage'
import TeamListPage       from './pages/TeamListPage'
import SpeakersPage       from './pages/SpeakersPage'
import AmbassadorsListPage from './pages/AmbassadorsListPage'
import AdvisoryBoardListPage from './pages/AdvisoryBoardListPage'
import BlogListPage       from './pages/BlogListPage'
import NewsListPage       from './pages/NewsListPage'
import NewsPostPage       from './pages/NewsPostPage'
import PrivacyPolicyPage  from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import RefundPolicyPage   from './pages/RefundPolicyPage'
import DynamicForm       from './pages/DynamicForm'
import AcceptInvite       from './pages/AcceptInvite'
import NewsletterUnsubscribe from './pages/NewsletterUnsubscribe'
import AdminLogin        from './admin/AdminLogin'
import AdminPanel        from './admin/AdminPanel'
import RequireAuth       from './admin/RequireAuth'
import AmbassadorAcceptInvite from './pages/AmbassadorAcceptInvite'
import AmbassadorLogin   from './pages/AmbassadorLogin'
import AmbassadorDashboard from './pages/AmbassadorDashboard'
import RequireAmbassadorAuth from './ambassador/RequireAmbassadorAuth'
import ComingSoonPage from './ambassador/ComingSoonPage'
import WebinarAnnouncementPopup from './components/WebinarAnnouncementPopup'
import NewsPopup from './components/NewsPopup'

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
    </>
  )
}

function App() {
  return (
    <Router>
      <PublicSitePopups />
      <Routes>
        <Route path="/"                       element={<HomePage />} />
        <Route path="/founder-message"        element={<FounderMessagePage />} />
        <Route path="/about"                  element={<AboutPage />} />
        <Route path="/certificate/:code"      element={<CertificatePage />} />
        <Route path="/portfolio/:slug"        element={<PortfolioPage />} />
        <Route path="/webinars"               element={<WebinarsListPage />} />
        <Route path="/courses"                element={<CoursesListPage />} />
        <Route path="/courses/:id"            element={<CourseDetailPage />} />
        <Route path="/team"                   element={<TeamListPage />} />
        <Route path="/speakers"               element={<SpeakersPage />} />
        <Route path="/ambassadors"            element={<AmbassadorsListPage />} />
        <Route path="/ambassadors/:id"        element={<AmbassadorProfilePage />} />
        <Route path="/advisory-board"         element={<AdvisoryBoardListPage />} />
        <Route path="/blog"                   element={<BlogListPage />} />
        <Route path="/blog/:slug"             element={<BlogPostPage />} />
        <Route path="/news"                   element={<NewsListPage />} />
        <Route path="/news/:slug"             element={<NewsPostPage />} />
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
      </Routes>
    </Router>
  )
}

export default App
