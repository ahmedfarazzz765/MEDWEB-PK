# MEDWEB — Changes (Round 4): Full Admin Dashboard ↔ Website

Goal: match the uploaded `dashboard.html` prototype — every section editable from the
admin panel, saved to Firebase, and reflected live on the user-facing website.
All output uses your existing React theme (Plus Jakarta Sans, #1655c3 / #64ac37).

## Prototype section → where it lives now

| Prototype Section      | Admin location                  | User side reads from        |
|------------------------|---------------------------------|-----------------------------|
| Overview               | Dashboard                       | —                           |
| Stats                  | Site Content → Hero Stats       | Hero stat cards             |
| Who We Are             | Site Content → Who We Are (NEW) | WhoWeAre + /about page (NEW)|
| Courses                | Courses (+ qualification, WhatsApp)| Featured Courses (WhatsApp enroll) |
| Webinars               | Webinars                        | Upcoming Webinars cards     |
| Why MEDWEB             | Site Content → Why MEDWEB       | WhyMedweb cards             |
| Founder Message        | Site Content → Founder          | FounderMessage + /founder-message |
| Testimonials           | Testimonials (NEW)              | Testimonials slider         |
| Ambassadors            | Ambassadors (+ apply-form toggle)| Ambassadors + apply button  |
| Blog Posts             | Blog Posts                      | Latest Blog                 |
| Form Builder           | Form Builder                    | /form/:id pages             |
| Certificates           | Certificates                    | Certificate verification    |
| Submissions            | Submissions (NEW)               | —                           |
| Footer & Quick Links   | Footer & Links (NEW)            | Footer (NEW dynamic)        |

## NEW admin pages
- **Site Content → Who We Are** — title, short text, full "Learn More" text, image.
- **Testimonials** — add/edit/delete, photo upload, stars, approve/hide. Slider reads approved ones.
- **Submissions** — ONE unified feed of webinar registrations + custom form submissions,
  with type filter, search, and CSV export.
- **Footer & Links** — about text, email, phone, social URLs, and a quick-links editor.

## NEW user-side pages / behaviors
- `/about` — full "Who We Are" page (opens from "Learn More").
- Footer is now fully dynamic (about, contacts, socials, quick links from Firebase).
- WhoWeAre title/short/image are dynamic.
- **Courses** now show an **"Enroll on WhatsApp"** button using each course's WhatsApp number
  (admin sets it per course, plus instructor qualification).
- **Ambassadors** "Apply" button is now admin-controlled: enable/disable, link a Form Builder
  form or external link (Ambassadors → Ambassador Apply Form card).

## Firebase
- `settingsService` (doc `settings/site`) now also stores: Who We Are (wwaTitle/wwaShort/wwaFull/wwaImage),
  Footer (footerAbout/Email/Phone/Facebook/Instagram/Linkedin/Whatsapp), quickLinks[],
  and ambassador apply settings (ambassadorApplyEnabled/FormId/Link). Added `.listen()`.
- NEW `submissionsService.listen()` merges `webinarRegistrations` + `formSubmissions`.
- `testimonialsService` already existed; now has a full admin UI.
- Images upload to **Cloudinary** (your existing setup) and the URL is saved to Firestore.

## Files
- NEW  `src/admin/pages/AdminTestimonials.jsx`, `AdminSubmissions.jsx`, `AdminFooter.jsx`
- NEW  `src/pages/AboutPage.jsx`
- EDIT `src/admin/pages/AdminContent.jsx` (Who We Are), `AdminCourses.jsx` (qualification + WhatsApp),
       `AdminAmbassadors.jsx` (apply-form settings)
- EDIT `src/sections/WhoWeAre.jsx`, `Footer.jsx`, `CoursesHighlight.jsx`, `Ambassadors.jsx`
- EDIT `src/firebase/services.js`, `src/App.jsx`,
       `src/admin/AdminPanel.jsx`, `components/AdminSidebar.jsx`, `components/AdminHeader.jsx`

## Run
```
npm install      # restores node_modules (excluded from zip)
npm run dev
```
Admin sidebar now has the full set: Dashboard, Students, Webinars, Courses, Certificates,
Ambassadors, Blog, Team, Email, Form Builder, Site Content, Testimonials, Submissions, Footer & Links.

> Reminder: paste your real keys in `src/firebase/config.js` and create an admin user in
> Firebase Console → Authentication, or login (and saves) won't work.
