import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage          from './pages/HomePage'
import WebinarRegister   from './pages/WebinarRegister'
import FounderMessagePage from './pages/FounderMessagePage'
import AboutPage          from './pages/AboutPage'
import CertificatePage    from './pages/CertificatePage'
import CourseDetailPage   from './pages/CourseDetailPage'
import AmbassadorProfilePage from './pages/AmbassadorProfilePage'
import BlogPostPage       from './pages/BlogPostPage'
import WebinarsListPage   from './pages/WebinarsListPage'
import CoursesListPage    from './pages/CoursesListPage'
import TeamListPage       from './pages/TeamListPage'
import AmbassadorsListPage from './pages/AmbassadorsListPage'
import AdvisoryBoardListPage from './pages/AdvisoryBoardListPage'
import BlogListPage       from './pages/BlogListPage'
import PrivacyPolicyPage  from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import RefundPolicyPage   from './pages/RefundPolicyPage'
import DynamicForm       from './pages/DynamicForm'
import AcceptInvite       from './pages/AcceptInvite'
import NewsletterUnsubscribe from './pages/NewsletterUnsubscribe'
import AdminLogin        from './admin/AdminLogin'
import AdminPanel        from './admin/AdminPanel'
import RequireAuth       from './admin/RequireAuth'
import WebinarAnnouncementPopup from './components/WebinarAnnouncementPopup'

function App() {
  return (
    <Router>
      <WebinarAnnouncementPopup />
      <Routes>
        <Route path="/"                       element={<HomePage />} />
        <Route path="/founder-message"        element={<FounderMessagePage />} />
        <Route path="/about"                  element={<AboutPage />} />
        <Route path="/certificate/:code"      element={<CertificatePage />} />
        <Route path="/webinars"               element={<WebinarsListPage />} />
        <Route path="/courses"                element={<CoursesListPage />} />
        <Route path="/courses/:id"            element={<CourseDetailPage />} />
        <Route path="/team"                   element={<TeamListPage />} />
        <Route path="/ambassadors"            element={<AmbassadorsListPage />} />
        <Route path="/ambassadors/:id"        element={<AmbassadorProfilePage />} />
        <Route path="/advisory-board"         element={<AdvisoryBoardListPage />} />
        <Route path="/blog"                   element={<BlogListPage />} />
        <Route path="/blog/:slug"             element={<BlogPostPage />} />
        <Route path="/privacy-policy"         element={<PrivacyPolicyPage />} />
        <Route path="/terms-of-service"       element={<TermsOfServicePage />} />
        <Route path="/refund-policy"          element={<RefundPolicyPage />} />
        <Route path="/webinar/:id/register"   element={<WebinarRegister />} />
        <Route path="/webinar/static/register" element={<WebinarRegister />} />
        <Route path="/form/:id"               element={<DynamicForm />} />
        <Route path="/unsubscribe"            element={<NewsletterUnsubscribe />} />
        <Route path="/admin/invite/:token"    element={<AcceptInvite />} />
        <Route path="/admin/login"            element={<AdminLogin />} />
        <Route path="/admin"                  element={<RequireAuth><AdminPanel /></RequireAuth>} />
        <Route path="/admin/*"                element={<RequireAuth><AdminPanel /></RequireAuth>} />
      </Routes>
    </Router>
  )
}

export default App
