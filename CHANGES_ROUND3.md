# MEDWEB — Changes (Round 3)

This round implements the remaining requested features. Theme colors, fonts,
gradients and the existing layout were preserved. Everything new is Firebase-driven.

## 1. Hero Section
- Matches the uploaded reference (Connecting / Medical / Minds headline, two CTAs,
  LIVE WEBINAR badge, ECG/Drug Therapy chips, four white stat cards).
- The four stat cards (15,000+ Students, 100+ Webinars, 20+ Instructors, 50+ Cities)
  are now **dynamic** — edited from Admin Panel → **Site Content → Hero Stats**.
- Fully responsive (stacks to single column on mobile, 2×2 stats on small screens).

## 2. Founder / CEO Message  (`src/sections/FounderMessage.jsx`)
- CEO picture is now **normal size** (portrait card, not full-bleed).
- Shows the founder image, name, designation, pull-quote, a short message, and a
  **"Read Full Message"** button.
- **"Read Full Message"** opens a dedicated page: `/founder-message`
  (`src/pages/FounderMessagePage.jsx`) showing the full multi-paragraph message.
- All founder content is **fetched from Firebase** (settings/site doc) and editable
  from Admin Panel → **Site Content → Founder Message**
  (image, name, designation, quote, short message, full message).

## 3. "Building Pakistan's Healthcare Future" (`WhoWeAre.jsx`)
- Picture kept at a normal, balanced size (portrait card with floating badges).

## 4. Upcoming Webinars — Card Redesign  (`src/sections/WebinarsSlider.jsx`)
Each webinar card now shows, top-to-bottom:
- **Webinar poster image** (top)
- **Webinar name** (below the poster)
- **Speaker picture** + in front of it the **speaker name** and **qualification**
- **Webinar date & time**
- The action button (Register Now / Watch Now) and optional Feedback button.

## 5. Dynamic Webinar Management  (Admin Panel → Webinars)
Admin can Add / Edit / Delete / Activate / Deactivate webinars. Each webinar holds:
- Webinar image, Speaker image, Title, Speaker name, Speaker qualification,
  Description, Date/Time, Status, YouTube link, Registration link/form, Feedback form.

### Button System (dynamic, controlled from dashboard)
- **Upcoming** → button shows **"Register Now"** → opens a **dedicated page** (not a popup).
- **Live** → admin sets Status = Live and pastes a YouTube/Live link → button switches to
  **"Watch Now"** → opens the YouTube live stream.
- Registration can optionally use a **custom Form Builder form** or an external link.

### Feedback System (independent per webinar)
- Enable/disable feedback per webinar, show/hide the feedback button, and attach either a
  **custom Form Builder feedback form** or an external feedback link.

## 6. Advanced Form Builder  (Admin Panel → Form Builder)  `src/admin/pages/AdminForms.jsx`
- Create / Edit / Delete / Activate-Deactivate forms.
- Supported fields: Text, Email, Phone, Dropdown, Radio, Checkbox, Textarea,
  Qualification, Semester, File upload (file uploads go to Cloudinary).
- Drag-order (move up/down), required toggle, options editor.
- **Copy form link** → forms render on a dedicated page `/form/:id`
  (`src/pages/DynamicForm.jsx`) — NOT a popup.
- Forms can be linked to webinar buttons (registration or feedback).
- **Responses viewer**: searchable/filterable table of all submissions per form, with
  **Export to CSV**. All submissions are saved in Firestore (`formSubmissions`).

## 7. Webinar Registration Form  (`src/pages/WebinarRegister.jsx`)
- Dedicated page (already in place): Full Name, Email, WhatsApp, Qualification,
  Semester, Question, Join WhatsApp Group checkbox. Saved to Firestore
  (`webinarRegistrations`) + auto-confirmation email.

## 8. Why MEDWEB Section  (`src/sections/WhyMedweb.jsx`)
- Fully dashboard controlled (Admin → Site Content → Why MEDWEB):
  edit title/subtitle, edit each card's icon + text, enable/disable cards, reorder cards.
- Design unchanged (gradient cards).

## Firebase
- New collections: `forms`, `formSubmissions`. Existing: `webinars`,
  `webinarRegistrations`, and `settings/site` (now also stores founder + whyMedweb + stats).
- `src/firebase/services.js` → added `formsService` and extended `settingsService`
  (added `.listen()` realtime listener).
- **Remember to paste your real Firebase keys in `src/firebase/config.js`.**

## New / changed files
- NEW  `src/pages/FounderMessagePage.jsx`
- NEW  `src/pages/DynamicForm.jsx`
- NEW  `src/admin/pages/AdminForms.jsx`
- NEW  `src/admin/pages/AdminContent.jsx`
- EDIT `src/sections/FounderMessage.jsx`, `WebinarsSlider.jsx`, `WhyMedweb.jsx`, `Hero.jsx`
- EDIT `src/admin/pages/AdminWebinars.jsx` (images + full field set + button/feedback systems)
- EDIT `src/firebase/services.js`, `src/App.jsx`
- EDIT `src/admin/AdminPanel.jsx`, `components/AdminSidebar.jsx`, `components/AdminHeader.jsx`

## Run
```
npm install
npm run dev      # local
npm run build    # production build
```
Admin panel: `/admin`  →  new entries **Form Builder** and **Site Content** in the sidebar.
