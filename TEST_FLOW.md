# MEDWEB — Full Website Test Flow (Admin + User)

A step-by-step scenario to test the whole site end-to-end. Work top-to-bottom.
Each section has **Admin action** → then the **User side** to confirm it worked.

Legend:
- 🔑 = needs you to be logged in as admin
- 🌐 = public (no login)
- ✅ = what you should see if it passed

---

## STAGE 0 — One-time setup (do this first)

1. **Firebase config** — open `src/firebase/config.js` and confirm your real keys are in
   (not `YOUR_API_KEY`). If they're placeholders, login and everything else will fail.

2. **Enable Email/Password auth**
   Firebase Console → Authentication → Sign-in method → enable **Email/Password**.

3. **Create your admin user**
   Authentication → Users → Add user → enter an email + password. This is your admin login.

4. **Publish Firestore rules** (the ones with `forms`, `formSubmissions`, `advisory`).
   Console → Firestore → Rules → paste → **Publish**. Skipping Publish = "insufficient permissions".

5. **Run the app**
   ```
   npm install
   npm run dev
   ```
   Open the local URL it prints (usually http://localhost:5173).

---

## STAGE 1 — Admin login

1. 🌐 Go to `/admin/login`.
2. Enter the email/password you created in Stage 0.
3. ✅ You land on the Admin Dashboard with the left sidebar (Dashboard, Students,
   Webinars, Courses, Certificates, Ambassadors, Blog Posts, Team, Form Builder,
   Site Content, Testimonials, Submissions, Footer & Links, Email Settings).

> If you get "insufficient permissions" anywhere below: you're either not logged in,
> or rules aren't published. Re-check Stage 0 steps 3–4.

---

## STAGE 2 — Site Content (stats, founder, who-we-are, why-medweb)

🔑 Admin → **Site Content**

1. **Hero Stats** — change the 4 numbers (e.g. Students = 16,000+). Save.
2. **Founder Message** — set founder name, designation, short message, full message,
   and upload a founder image. Save.
3. **Who We Are** — set title, short text, full text, upload an image. Save.
4. **Why MEDWEB** — edit a card's title/text, toggle one off, reorder, add a new card. Save.

🌐 Open `/` (home page) in a new tab and confirm:
- ✅ Stats band (after the hero, **before** "A Vision for Every Student") shows your new numbers.
- ✅ Founder section shows your name/photo/short message.
- ✅ "Who We Are" shows your title/text/image, no "5+ Years" badge.
- ✅ "Why MEDWEB" cards reflect your edits (and the disabled card is hidden).

🌐 Click **Read Full Message** under the founder → opens `/founder-message` with the full text.
🌐 Click **Learn More** in Who We Are → opens `/about` with the full text.

---

## STAGE 3 — Courses

🔑 Admin → **Courses** → "+ Add Course"
- Title, instructor, instructor qualification, type (Free/Paid), WhatsApp number,
  description, image. Status = Active. Save.

🌐 Home page → "Featured Courses":
- ✅ Your new course appears (cards pull live from Firebase).
- ✅ Click **Enroll on WhatsApp** → opens WhatsApp with a pre-filled message to that number.

Test edit/delete: change the title in admin → ✅ home updates. Delete → ✅ it disappears.

---

## STAGE 4 — Webinars + the button system

🔑 Admin → **Webinars** → "+ Schedule Webinar"
- Upload **webinar poster** + **speaker image**, fill title, speaker name,
  qualification, description, date, time, type. **Status = Upcoming.** Save.

🌐 Home page → "Upcoming Webinars":
- ✅ Card shows poster on top, title, speaker photo with name + qualification beside it,
  date & time, and a **Register Now** button. All cards are the same size.

**Test the button switch (Register → Watch):**
1. 🔑 Edit the webinar → Status = **Live**, paste a YouTube link → Save.
2. 🌐 Refresh home → ✅ the button is now **Watch Now**; clicking opens the YouTube link.
3. 🔑 Set Status back to **Upcoming** → ✅ button is **Register Now** again.

---

## STAGE 5 — Webinar registration (USER submitting data)

🌐 On an Upcoming webinar card → click **Register Now**
- ✅ Opens a **dedicated page** (not a popup).
- Fill Full Name, Email, WhatsApp, Qualification, Semester, a question, tick "Join WhatsApp Group". Submit.
- ✅ You see a success/thank-you confirmation.

🔑 Admin → **Submissions**
- ✅ Your registration appears in the list (type = Webinar) with name/email/WhatsApp.
- ✅ "Export CSV" downloads the data.

---

## STAGE 6 — Form Builder + custom form (USER submitting data)

🔑 Admin → **Form Builder** → "+ Create Form"
- Title (e.g. "Scholarship Application"). Add fields: Text, Email, Phone, Dropdown
  (add options), Qualification, Semester, File upload, Checkbox. Status = Active. Save.
- ✅ Click the **link icon** on the form row → copies a `/form/<id>` URL.

🌐 Paste that `/form/<id>` URL in a new tab:
- ✅ The form renders on its own page with your fields.
- Fill it (try the file upload too) and Submit → ✅ success screen.

🔑 Admin → Form Builder → **eye icon** on that form (or **Submissions** page):
- ✅ Your response shows up; ✅ Export CSV works; ✅ uploaded file opens via its link.

**Attach a form to a webinar (optional):**
1. 🔑 Webinars → edit a webinar → set "Registration → attach a custom form" to your new form. Save.
2. 🌐 That webinar's **Register Now** now opens your custom form instead of the built-in one.

---

## STAGE 7 — Certificates (ISSUE to a user + USER verifies)

🔑 Admin → **Certificates** → "+ Issue Certificate"
- A **Certificate Code** is auto-generated (e.g. CERT-MW-2025-XXXXX).
- Enter the student name, pick the course, set the issue date. Status = Valid. Save.
- 📋 Copy the certificate code.

🌐 This is the "give it to the user" step — share that code with the user (WhatsApp/email).

🌐 User side — Home page → **Certificate Verification** box:
- Paste the code → click **Verify Now**.
- ✅ Shows "Certificate Verified Successfully" with the student name, course, issue date.

**Test revoke:**
1. 🔑 Certificates → click the revoke (✕) icon on that cert.
2. 🌐 Verify the same code again → ✅ now shows "Certificate Not Found / Revoked".

**Test a fake code:**
- 🌐 Type a random code → ✅ "Certificate Not Found".

---

## STAGE 8 — Testimonials

🔑 Admin → **Testimonials** → add one (photo, name, university, stars, text, Status = Approved). Save.
🌐 Home → Testimonials slider → ✅ your testimonial appears.
🔑 Set it to **Hidden** → 🌐 ✅ it disappears from the slider.

---

## STAGE 9 — Ambassadors (+ apply button)

🔑 Admin → **Ambassadors** → add an ambassador (photo, name, city, role, Status = Active). Save.
🌐 Home → Ambassadors section → ✅ appears.

**Apply button:**
1. 🔑 In Ambassadors, find the "Ambassador Apply Form" card → toggle **Show Apply button** ON,
   and link your Form Builder form (or paste a link). It saves automatically.
2. 🌐 Home → ✅ "Apply as Ambassador" button shows; clicking opens the linked form/page.
3. 🔑 Toggle it OFF → 🌐 ✅ the button disappears.

---

## STAGE 10 — Blog

🔑 Admin → **Blog Posts** → add a post (title, image, excerpt, content). Publish. Save.
🌐 Home → "Latest Blog" → ✅ your post appears with image and excerpt.

---

## STAGE 11 — Team / Advisory

🔑 Admin → **Team** → add a member (photo, name, role). Save.
🌐 Home → Team section → ✅ appears.
(Advisory Board works the same if you use it.)

---

## STAGE 12 — Footer & Quick Links

🔑 Admin → **Footer & Links**
- Edit About text, email, phone, social URLs. Edit/add a Quick Link. Save.
🌐 Home → scroll to footer → ✅ shows your About text, contacts, working social icons,
  and the quick links (each scrolls/links correctly). ✅ Footer uses the blue→teal→green gradient.

---

## STAGE 13 — Responsiveness + final pass

1. 🌐 Open `/` and resize the browser narrow (or use phone view / DevTools device mode):
   - ✅ Hero stacks, stats become 2×2, webinar/course cards stack, nothing overflows sideways.
2. 🌐 Click through the nav links (Home, About, Courses, Webinars, Certificates, Blog, Contact)
   → ✅ each scrolls/opens the right section/page.
3. 🌐 Test on a real phone if possible.

---

## Quick "is it broken?" cheatsheet

| Symptom | Most likely cause |
|---|---|
| "Missing or insufficient permissions" on save | Not logged in, or rules not Published (esp. `forms`/`formSubmissions`) |
| Login fails: `auth/api-key-not-valid` | `src/firebase/config.js` still has placeholder keys |
| Login fails: invalid credentials | No matching user in Firebase Auth → create one |
| Admin saves work but home shows old data | Hard refresh; check the section's Status (Active/Approved/Published) |
| Courses/webinars not showing | Status set to Inactive/Draft/Hidden, or none added yet (fallback demo shows) |
| Images don't upload | Cloudinary cloud name/preset in `src/firebase/cloudinary.js` |
| Certificate won't verify | Code typo, or cert was Revoked |

---

### The shortest possible smoke test (5 minutes)
1. Login at `/admin/login`.
2. Issue a certificate → copy code.
3. Open `/` → Certificate Verification → paste code → ✅ Verified.
4. Schedule an Upcoming webinar → open `/` → ✅ card shows with Register Now.
5. Register on it → Admin → Submissions → ✅ entry present.

If those 5 pass, the core admin↔user↔Firebase loop is working.
