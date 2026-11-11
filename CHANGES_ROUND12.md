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
