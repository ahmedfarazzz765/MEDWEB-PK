# MEDWEB — Changes (Round 1)

This round covered the high-priority structural changes plus the webinar button system.

## 1. Layout / Structure
- **Courses moved BELOW Webinars** on the homepage (per requirement:
  "COURSE WALA SECTION WEBINAR KAY NEECHAY KR DAIN").
  Order is now: Hero → Founder → Who We Are → **Webinars → Courses** → Why MEDWEB → Testimonials → Team → Advisory Board → Ambassadors → Certificate → Blog → Footer.
- **"Our Team" slider** already existed (`src/sections/About.jsx`) and is dashboard-controlled via `teamService`.
- **NEW "Advisory Board" slider** added (`src/sections/AdvisoryBoard.jsx`), dashboard-controlled via the new `advisoryService` (Firestore collection: `advisory`). Each member has name, role, qualification, image.

## 2. Webinar Button System (per requirements pages 6–7)
- Registration is now a **dedicated full page** (`/webinar/:id/register`) — **NOT a popup**. The old modal was removed.
  - Full detailed form: Full Name, Email, WhatsApp Number, Qualification, Semester/Year, Question related to the webinar, and a "Join WhatsApp group" checkbox. Saved to Firestore (`webinarRegistrations`).
- **Register Now → Watch Now switching**, controlled from the dashboard:
  - When a webinar's **Status = Live**, the card automatically shows a red **"Watch Now"** button that opens the **YouTube/Live link**.
  - Otherwise it shows **"Register Now"** which opens the dedicated registration page.
- **Feedback button** per webinar: admin can enable/disable it and attach a feedback form link. Works independently for each webinar.

## 3. Admin Panel (Webinar Management)
`src/admin/pages/AdminWebinars.jsx` now lets you set, per webinar:
- Status (Upcoming / Live / Completed)
- **YouTube / Live Link** (used by "Watch Now")
- **Enable feedback button** + **Feedback form link**

## Files changed / added
- `src/pages/HomePage.jsx` (reordered, added Advisory Board)
- `src/sections/AdvisoryBoard.jsx` (NEW)
- `src/sections/WebinarsSlider.jsx` (Watch Now logic, removed popup)
- `src/pages/WebinarRegister.jsx` (NEW dedicated page)
- `src/App.jsx` (routes)
- `src/firebase/services.js` (advisoryService + `advisory` collection)
- `src/admin/pages/AdminWebinars.jsx` (YouTube + feedback fields)

## Still pending (large items for next rounds)
- Advanced Form Builder + Form Responses table/export
- Certificate verification with PDF upload/download
- Blog detail pages / related posts
- "Apply for Ambassador" dedicated form page
- Founder / Who-We-Are dedicated "Learn More" detail pages
- Auto-email system on registration
- Admin pages for: Advisory Board, Team, Testimonials, Footer, Stats, Why MEDWEB, Settings

> Note: theme colors, fonts, gradients, card sizes, and layout were NOT changed — only section order and the webinar button behavior, as requested.
