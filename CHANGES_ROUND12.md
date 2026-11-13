# MEDWEB — Changes (Round 12)

## Prompt 1 — Critical fixes

### 1. `/contact` rendered blank
- There was never a dedicated Contact page — "Contact" in the navbar/footer
  is really an anchor link to the homepage Footer's contact section
  (`#contact`). A direct hit on the bare `/contact` path matched no route
  (no catch-all existed either), so React Router rendered nothing.
- Added `<Route path="/contact" element={<Navigate to="/#contact" replace />} />`
  (`App.jsx`) — redirects to the real anchor, reusing the scroll-to-hash
  logic `HomePage.jsx` already had.
- Added a real error boundary (`components/ErrorBoundary.jsx`, new) around
  `<Routes>` in `App.jsx`, so any future render crash shows a "Something
  went wrong" screen instead of a blank page.

### 2. `blogCategories` "Missing or insufficient permissions"
- Root cause is the deployed Firestore rules, not the query — `blogCategoriesService.listen()`
  (`services.js`) is a plain public read, same shape as every other public
  listener. No local `firestore.rules` file exists in this repo (rules are
  managed directly in Firebase Console), so this needs a manual rule
  addition — not committed as part of this round:
  ```
  match /blogCategories/{id} {
    allow read: if true;
    allow write: if request.auth != null;
  }
  ```
- Not user-visible in the meantime: `Navbar.jsx` already merges in
  `DEFAULT_BLOG_CATEGORIES` regardless, so the Blog dropdown renders fine
  even while this error is in the console.

### 3. Desktop horizontal scroll (Trusted Partners marquee)
- Real cause: `overflow-x: hidden` existed only on `body`, not `html`
  (`index.css`). Once `body` has an explicit `overflow` value, the
  viewport's own horizontal scrollbar is governed by `html` in most
  browsers — `body`'s rule alone doesn't reliably suppress it. Added
  `overflow-x: hidden` to the `html` selector too.

### 4. Medical News popup
- Rewritten (`components/NewsPopup.jsx`): hidden entirely below 768px;
  on desktop it's now a small dismissible pill badge (bottom-right) instead
  of the old full thumbnail+title card.
- Dismissal is saved to `localStorage`, keyed per news item id, so closing
  it stays closed across refreshes/future visits — a newly published item
  still gets its own first showing.

### 5. Homepage "Upcoming Webinars" with none upcoming
- `WebinarsSlider.jsx`: heading now shows "Recent Webinars" instead of
  "Upcoming Webinars" when there are no Live/Upcoming webinars — the list
  was already sorted newest-first for the Completed-only case
  (`sortWebinars`), so no reorder was needed.

### 6. Removed "Admin Login" from public navbar
- `Navbar.jsx`: removed both the desktop and mobile-menu "🛡 Admin Login"
  buttons. `/admin` route itself is untouched — still reachable directly.

### 7. Zero-count categories / fake star ratings
- `sections/About.jsx` + `pages/TeamListPage.jsx`: a Team category with 0
  active members is now hidden from the category grid, on both the
  homepage and `/team`.
- `sections/Ambassadors.jsx` + `pages/AmbassadorProfilePage.jsx`:
  `pointsToStars()` returned a fabricated 1 star for every ambassador with
  zero points and no manual ranking — now returns 0, and the star row is
  hidden entirely when there's no real rating.

---

**Verification:** every touched file passed an `esbuild` syntax check.
`npm run dev` started successfully; curl confirmed `/`, `/contact`, `/team`,
`/ambassadors` all return HTTP 200. No real browser available in this
environment — actual UI behavior (redirect landing spot, popup badge
appearance/persistence, horizontal-scroll absence, star/category hiding)
still needs manual verification.

## Prompt 2 — Real numbers & real testimonials

### 1. Homepage counters computed from Firestore
- `hooks/useComputedStats.js` (new): shared hook computing 4 of the 6
  homepage counters live — Students Trained (`studentsDbService`),
  Webinars Hosted (status Completed only), Certificates Issued (status
  not Revoked only), Courses Available (status Active only). Expert
  Instructors and Cities Reached have no matching collection to compute
  from and stay manual, unchanged.
- `sections/Stats.jsx` + `sections/WhyMedweb.jsx`: both already shared
  the same `STATS` config (per an existing code comment) — both now call
  the shared hook instead of just displaying the raw saved settings
  string, so the fix lives in one place, not duplicated.
- `admin/pages/AdminContent.jsx`: added a "Manual override" checkbox next
  to each of the 4 computed fields. Unchecked (default) = live-computed,
  input disabled with a "Computed live from Firestore" placeholder;
  checked = the admin's typed value is used, same behavior as before this
  round.

### 2. Testimonials — approved only, no YouTube comments
- The "only approved items" half was already correctly implemented
  (`testimonialsService.listen` already filtered by status).
- `sections/Testimonials.jsx`: now also excludes
  `category === 'YouTube Review'` — the exact tag
  `pendingTestimonialsService.approve()` writes for an approved
  YouTube-comment item (Google Reviews and anything else still show).

### 3. Announcement bar start/end dates
- `autoHideDate` (expiry) already existed and worked
  (`lib/announcements.js`'s `isAnnouncementActive()`).
- Added the missing half: a new `startDate` field. `isAnnouncementActive()`
  now also returns false if `startDate` is set and still in the future.
- `admin/pages/AdminAnnouncements.jsx`: added the Start Date input next to
  the existing Auto-hide Date field, a new "Starts" table column, and a
  distinct "Scheduled" status badge (vs. "Expired") for an announcement
  whose start date hasn't arrived yet.

---

**Verification:** every touched file passed an `esbuild` syntax check.
`npm run dev` started cleanly; curl confirmed `/`, `/announcements`,
`/contact` all return HTTP 200. Same caveat as Prompt 1 — no real browser
available, so this confirms the server doesn't crash, not that the UI
renders/behaves correctly.

## Prompt 3 — Technical SEO

### 1. react-helmet-async — unique title/description/canonical/OG/Twitter
- Installed `react-helmet-async@3.0.0`. `main.jsx` wraps `<App>` in
  `<HelmetProvider>`.
- `components/SEO.jsx` (new): shared component rendering title,
  description, canonical, Open Graph, Twitter Card, and optional JSON-LD.
- Wired into `HomePage`, `WebinarDetailPage`, `CourseDetailPage`,
  `BlogPostPage`, `NewsPostPage` (migrated off the old imperative
  `setPageMeta()` — see `lib/pageMeta.js`, still used by
  `CertificatePage.jsx` which wasn't in this prompt's scope),
  `AnnouncementPage`, and every list/legal page (Webinars, Courses, Blog,
  News, Team, Speakers, Ambassadors, Advisory Board, Announcements, About,
  Privacy/Terms/Refund) — 22 pages total.

### 2. Pre-rendering for crawlers/link previews
- Not full headless-Chrome DOM prerendering — too heavy (needs a Chromium
  binary in CI) for what's actually needed here. Instead:
  `scripts/generate-static-meta.js` (new) runs after `vite build` and
  writes a real `dist/<route>/index.html` per public route, built from the
  actual compiled `dist/index.html` (correct hashed asset paths) with that
  route's own title/description/canonical/OG/Twitter tags injected into
  the raw HTML — so a non-JS crawler (WhatsApp, LinkedIn, Twitter) sees
  real per-page content immediately, not the generic site-wide tags every
  route shared before. A real browser still loads the same JS bundle and
  gets the full interactive app; `react-helmet-async` keeps tags in sync
  client-side on top of this.
- Host reality check: the actual deploy target is **Hostinger via FTP**,
  not Vercel — `vercel.json` is leftover/unused (confirmed earlier) and
  wasn't touched. Configured `public/.htaccess` instead (see #4 below).
- `package.json`: `"build"` now runs
  `generate-sitemap.js && vite build && generate-static-meta.js`.
- `.github/workflows/deploy.yml`: build step now also gets
  `FIREBASE_SERVICE_ACCOUNT` (same secret `scripts/fetch-health-news.js`
  already uses) so the dynamic per-item pages actually generate in CI —
  both scripts degrade gracefully (warn + static-only output) without it,
  so a local build never fails over a missing secret.
- Known limitation: `generate-static-meta.js`'s static-page titles/
  descriptions are hand-kept in sync with each page's `<SEO>` props (a
  plain Node script can't import JSX) — update both if one changes.

### 3. Sitemap
- `scripts/generate-sitemap.js` (new): writes `public/sitemap.xml` from
  the static route list plus real Firestore data — published webinars,
  active courses, published blog posts, published news, enabled
  announcements. Runs before `vite build` so Vite copies the real file
  into `dist/`. Gitignored (regenerated every build, a committed snapshot
  would just go stale).

### 4. Real 404
- `pages/NotFoundPage.jsx` (new) + a `<Route path="*">` catch-all in
  `App.jsx` — there was no fallback at all before (confirmed in Prompt 1:
  an unmatched path rendered blank).
- `public/.htaccess`: replaced the blanket rewrite-everything-to-200 rule
  with `ErrorDocument 404 /index.html` — Apache serves a real file
  directly (200) when one exists (including every route
  `generate-static-meta.js` pre-generates), and only falls back to
  index.html's body under a genuine 404 status for anything else, so a
  truly broken/typo'd URL is no longer indistinguishable from a real page
  to crawlers or monitoring tools that check status codes.

### 5. JSON-LD
- `HomePage`: `EducationalOrganization`.
- `WebinarDetailPage`: `Event` (startDate parsed defensively from the
  admin's free-text date/time fields — omitted rather than ever emitted
  invalid if unparseable).
- `CourseDetailPage`: `Course` (+ `AggregateRating` when a real rating
  exists).

---

**Housekeeping:** `.gitignore` was missing `dist` entirely (only
`dist-ssr` was listed) — added, now that a real build was actually run
locally to verify all of the above.

**Verification:** every touched/new file passed an `esbuild` syntax
check, AND the full `npm run build` was actually run end-to-end (not just
syntax-checked) — completed successfully: 15-URL sitemap generated
correctly, Vite build succeeded (pre-existing ~2.8MB main JS bundle
warning — that's Prompt 4's scope), and `generate-static-meta.js`
correctly produced all 13 static route pages (dynamic per-item pages were
correctly skipped — no `FIREBASE_SERVICE_ACCOUNT` available in this
sandbox; they'll generate for real in actual CI). Spot-checked
`dist/webinars/index.html` and the homepage's own `dist/index.html` —
all tags present and correct. `npm run dev` still serves all routes
including the new 404 catch-all.

## Prompt 4 — Performance

### 1. Code-splitting — main bundle under the 250 KB gzip target
- Every route in `App.jsx` converted to `React.lazy(() => import(...))` —
  previously every page (including the entire `/admin` area pulling in
  xlsx, jspdf, html2canvas, Tiptap, dnd-kit, and the whole Ambassador
  dashboard) was bundled into one shared chunk regardless of whether a
  visitor ever opened `/admin`. Went further than "lazy-load `/admin`"
  (the prompt's literal wording) and lazy-loaded every route — the
  standard pattern, and the only way to get the main chunk genuinely
  small rather than just moving the admin weight into a second
  always-loaded chunk.
- `HomePage.jsx`: everything below the Hero (`TrustedPartners`, `Stats`,
  `FounderMessage`, `WebinarsSlider`, `CoursesHighlight`, `WhyMedweb`,
  `Testimonials`, `Team`, `AdvisoryBoard`, `Ambassadors`,
  `CertificateVerification`, `LatestBlog`, `Footer`) is also lazy, each
  in its own `<Suspense fallback={null}>` so one slow chunk doesn't block
  the rest. `WelcomeBar`/`Navbar`/`AnnouncementTicker`/`Hero` stay eager
  — that's everything visible without scrolling.
- `components/PageLoader.jsx` (new): minimal spinner, the route-level
  `<Suspense>` fallback in `App.jsx`.
- **Before:** one ~2.8 MB / 804.81 KB gzip main chunk (from Prompt 3's
  build).
  **After** (`npm run build`): main chunk is now **854.79 KB / 228.41 KB
  gzip** — under the 250 KB gzip target. `/admin` (xlsx/jspdf/
  html2canvas/Tiptap/dnd-kit, 1,064.73 KB / 323.85 KB gzip) and
  `jspdf`/`html2canvas` (used by certificate generation, 390 KB/201 KB
  raw) now live in their own chunks, fetched only when actually needed
  — a visitor who never opens `/admin` or downloads a certificate never
  loads them.

### 2. Image loading attributes + alt-text audit
- `components/CoverImage.jsx` (the shared wrapper used at ~49 call sites
  across sections/pages/admin) now defaults to `loading="lazy"
  decoding="async"` — fixes every call site at once rather than
  repeating the same two attributes 49 times. No caller passes an
  explicit `loading`/`decoding`, so this is a pure addition, not a
  behavior change for anyone already relying on eager loading (nothing
  was eager before).
- Added the same two attributes directly to the handful of raw `<img>`
  tags outside `CoverImage` that aren't above-the-fold or interactive-
  editor previews: `TrustedPartners.jsx`, `NewsPostPage.jsx`,
  `CertificatePage.jsx`, `AmbassadorProfilePage.jsx`,
  `CertificateCard.jsx`. Left `AdminCertificates.jsx`/
  `CertPositionEditor.jsx`/`LetterPositionEditor.jsx` alone — their
  `<img>` drives an `onLoad` canvas-positioning handler for an editor
  that's visible immediately on its own page, where lazy-loading could
  delay that handler firing.
- Alt-text audit: every literal `<img>` tag already had an `alt`
  attribute (even if empty/decorative, which is valid). The real gap was
  16 `<CoverImage>` call sites — all in admin list/table thumbnails
  (`AdminTeam`, `AdminNews`, `AdminCourses`, `AdminBlog`,
  `AdminAnnouncements`, `AdminAmbassadors`, `AdminAdvisoryBoard`,
  `AdminDashboard`) — that didn't pass an `alt` prop at all and silently
  fell back to `CoverImage`'s own `alt=''` default. Added real alt text
  (the row's `name`/`title` field) to each; two of the table-column
  cases needed their `render(v)` signature changed to `render(v, row)`
  since the shared `DataTable` component already passes the full row as
  a second arg — reused existing API, no new plumbing.

### 3. Hero preload
- Hero image preload (`<link rel="preload" as="image">` via
  `react-helmet-async`, conditional on the bundled fallback actually
  being in use rather than an admin-uploaded override) already existed
  in `Hero.jsx` from earlier work — now automatically points at the new
  WebP (see #4). Hero/body font (`Poppins`) already loads with
  `fetchpriority="high"` in `index.html`. Nothing else qualifies as
  hero-critical, so nothing else was added here.

### 4. WebP conversion of bundled `src/assets` images (user-requested addition)
- Installed `sharp` (devDependency, build-time only — not shipped to the
  browser) and used it to convert the 5 images actually imported by app
  code to WebP at (or safely above, for retina) their real displayed
  size, replacing the originals:
  | File | Used in | Before | After | Savings |
  |---|---|---|---|---|
  | `medweb.png` → `medweb.webp` + `medweb-logo.png` | Navbar/Footer logo (several other usages) | 935.5 KB | 76.1 KB webp + 47.1 KB PNG fallback | ~87% |
  | `founder_pic.png` → `founder_pic.webp` | FounderMessage portrait | 1,860.8 KB | 96.6 KB | ~95% |
  | `hero_clean.jpeg` → `hero_clean.webp` | Hero background | 142.2 KB | 61.8 KB | ~57% |
  | `hero_doctors.jpeg` → `hero_doctors.webp` | WhyMedweb card | 252.1 KB | 32.6 KB | ~87% |
  | `doctors.png` → `doctors.webp` | WhyMedweb card | 1,973.4 KB | 38.0 KB | ~98% |
  | **Total** | | **5,164.0 KB** | **~252.2 KB** | **~95%** |
  Resize targets: logo 420×420 (covers its largest real use, the 208px
  `LaunchIntro` reveal animation, at 2x retina); founder portrait 1100px
  wide (its real column is ~553–640px); WhyMedweb cards 700px wide
  (~294px rendered, 2x+ headroom); hero kept at its original 922×1024 —
  already smaller than the viewport it's stretched to via `bg-cover`, so
  upscaling it would only add weight with no quality gain.
- PNG fallback kept **only for the logo** (`medweb-logo.png`), as asked
  — `components/Logo.jsx` (new) renders a `<picture>` with the WebP as
  `<source>` and the PNG as the `<img>` fallback, used at the 3 places
  the logo is the primary visible brand mark (`Navbar`, `Footer`,
  `About`'s tiled watermark uses the WebP directly via plain
  `background-image`, since a `<picture>` fallback isn't meaningful for
  a CSS background). Every other logo usage (`AdminLogin`,
  `AmbassadorTopbar`, `AmbassadorDashboard`, `BrandWatermark`,
  `LaunchIntro`) — all decorative or admin-only, not public SEO/link-
  preview surface — now imports `medweb.webp` directly with no fallback,
  since WebP-incapable browsers are no longer a practical concern there.
- Deleted the now-unreferenced originals (`medweb.png`, `founder_pic.png`,
  `hero_clean.jpeg`, `hero_doctors.jpeg`, `doctors.png`) from
  `src/assets/` after confirming (`grep -rn` across `src/`) nothing still
  imports them. **`public/favicon.png` was not touched** — it's a
  separate physical file (byte-identical to the old `medweb.png` by
  coincidence, not by reference) and favicons need a raster format
  browsers/OS chrome support universally, which WebP isn't guaranteed to
  be for every consumer (OS taskbar icons, some crawlers).

---

**Verification:** every touched/new file passed an `esbuild` syntax
check. `npm run build` completed successfully end-to-end (sitemap +
Vite build + static-meta generation, same as Prompt 3) — real
before/after bundle numbers above are from this build's own output, not
estimated. `npm run dev` started cleanly on port 5177 (5173–5176 were
already in use by leftover processes from earlier rounds); curl
confirmed `/`, `/team`, `/about`, `/founder-message`, `/courses`,
`/webinars` all return HTTP 200. No real browser available in this
environment — the actual visual result (images displaying correctly at
their new WebP paths, lazy-loaded sections still appearing on scroll,
Suspense fallback not flashing awkwardly, logo `<picture>` fallback)
still needs manual verification in a browser.

## Prompt 5 — Admin reliability

### 1. Real per-screen routes
- `admin/AdminPanel.jsx`: the active section (and, for the Content page,
  its internal tab) now comes from the URL (`/admin/webinars`,
  `/admin/content/founder`, ...) via `useLocation`, instead of
  component state that reset on every reload. Refresh, back/forward, and
  bookmarking a specific admin screen all now land back on the same
  screen instead of always bouncing to Dashboard.
- `admin/components/AdminSidebar.jsx`'s `onNav` already called into a
  callback prop — only `AdminPanel.jsx`'s own `handleNav` changed, now
  calling `navigate()` instead of `setState`. No sidebar markup changed.

### 2. Webinars "Reg." / "Total Registered" showing 0
- Root cause found: each webinar's own `registered` counter is a
  best-effort `increment(1)` fired from `WebinarRegister.jsx` at
  submission time, wrapped in `.catch(() => {})` — any failure (a rules
  issue, a stale `webinar` object, anything) silently no-ops, and the
  153 real registrations never incremented it.
- Fixed at the source of truth instead of chasing that failure: both the
  Webinars table's "Reg." column and the "Total Registered" stat card
  (`admin/pages/AdminWebinars.jsx`) now count live from the real
  `webinarRegistrations` collection (`webinarsService.listenRegistrations`,
  new in `services.js`), grouped by `webinarId` — immune to the same
  failure happening again, and correct retroactively for the 153 that
  already existed.

### 3. Flag + edit/merge bad submissions
- `admin/pages/AdminSubmissions.jsx`: a registration is flagged (⚠ icon
  next to the name) when its resolved name is empty or its resolved
  email doesn't match a basic email shape — covers "empty name or
  mismatched email" from the prompt.
- Added an Edit action (pencil icon) per registration — corrects
  name/phone/email/university. Writes to whichever field key the
  webinar's own registration form schema actually resolves (a custom
  Form-Builder field's key, or the flat fallback key), not blindly to
  `name`/`email`/`whatsapp`, so the fix is never silently shadowed by a
  still-present custom field value with higher read priority.
- Added Merge: tick 2 flagged rows in the same webinar's folder, "Merge
  Selected" combines them into one record (keeping whichever field is
  actually filled in from either) and deletes the other.
  `webinarsService.updateRegistration`/`deleteRegistration` (new) back
  both actions. Merge is Super-Admin-only (it deletes a record) — same
  rule as every other delete in the panel (see #5).

### 4. Reports page
- `admin/pages/AdminReports.jsx` (new): one table of
  registrations/attendance/certificates per webinar (registrations from
  the same live count as #2; attendance from the webinar's own
  `attended` field — there's no UI anywhere else in the panel to set
  that, which is pre-existing and outside this prompt's scope to build;
  certificates grouped by source, excluding Revoked, same rule Prompt 2
  used for the homepage counter) and one table of certificates per
  course. Courses have no registration/enrollment data model in this
  app at all (no payments/enrollment flow, by this project's own
  ground rules) — registrations/attendance show "—" there rather than a
  fabricated 0.
- CSV export via `.xlsx` (reuses the exact `XLSX.utils.json_to_sheet` /
  `XLSX.writeFile` pattern `AdminStudents.jsx`/`AdminCertificates.jsx`
  already use — same library, no new dependency), one workbook with a
  Webinars sheet and a Courses sheet.
- Added to the sidebar (Engagement group) and `adminSections.js` as a
  grantable section, so a Super Admin can give an Editor/Viewer access
  to it like any other section.

### 5. Roles (Super Admin / Editor / Viewer) + Activity Log
- `admin/hooks/useAdminPermissions.js` now also resolves `role`
  (`'superadmin' | 'editor' | 'viewer'`), `canWrite`, `canDelete`. A
  restricted admin doc with no `role` field (every one created before
  this round) or the old literal `'admin'` value defaults to `'editor'`
  — nobody's existing access silently changed.
- `admin/components/ActionButtons.jsx` — the shared edit/delete icon
  pair used across every admin table — now reads these itself: a Viewer
  never sees Edit or Delete, an Editor never sees Delete. One chokepoint
  instead of gating ~20 individual admin pages.
- `admin/pages/AdminUsers.jsx`: invite/edit form now has an Editor/Viewer
  role picker; the admin list shows each sub-admin's role as a badge.
  "Only Super Admin can manage admins" was already enforced (page itself
  is gated to `isSuperAdmin`) — satisfies "Editor can't ... manage
  admins" with no further change needed there.
- `services.js`: new `activityLogService` (collection `activityLog`) —
  `log(action, details)` auto-attaches the signed-in admin's email +
  timestamp; never blocks the real action if the write itself fails.
  **Not instrumented on every admin write** — that would touch nearly
  every admin page for one feature. Covers admin-user management
  (invite/update/remove) and the two features this same prompt touched
  (webinar create/update/delete, registration edit/merge). Viewable at
  the new Super-Admin-only `/admin/activityLog`
  (`admin/pages/AdminActivityLog.jsx`, new).
- **Known gap, flagged rather than silently left out:** a Viewer can
  still see each page's "Add new" button — only Edit/Delete are gated
  centrally via ActionButtons. Gating every page's own creation button
  individually would mean touching ~20 files for a role this prompt
  only asked to partially restrict ("Editor can't delete or manage
  admins" — Viewer's own restriction level wasn't specified beyond its
  name). Worth a follow-up if full read-only enforcement matters.

---

**Verification:** every touched/new file passed an `esbuild` syntax
check, AND the full `npm run build` ran end-to-end successfully (main
bundle unaffected at 228.62 KB gzip — all of this is inside the
already-lazy `/admin` chunk). `npm run dev` started cleanly; curl
confirmed `/`, `/admin`, `/admin/webinars`, `/admin/submissions`,
`/admin/reports`, `/admin/activityLog`, `/admin/content/founder`,
`/admin/adminUsers` all return HTTP 200. No real browser available in
this environment — the actual UI behavior (URL changes on sidebar
click, registration counts matching real Firestore data, merge/edit
modals, role-based button hiding) still needs manual verification by
signing into the real admin panel.
