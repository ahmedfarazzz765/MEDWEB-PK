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
