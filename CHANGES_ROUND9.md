# MEDWEB — Changes (Round 9): Hero as full-background image

The hero now uses your uploaded banner as a **full-bleed background image**, with live,
clickable text + buttons overlaid on top — same behaviour on desktop and mobile.

## What changed (`src/sections/Hero.jsx`)
- Uploaded image saved to `src/assets/hero_banner.jpeg` and set as the full background
  (`object-cover`, fills the whole section).
- Live overlaid content on top: the "Connecting / Medical / Minds" headline (real text,
  with the blue→green gradient word), the sub-paragraph, and the two working buttons
  (Explore Courses → #courses, Join Webinar → #webinars).
- A left-side gradient **scrim** keeps the overlaid text crisp and readable:
  - Desktop: horizontal fade (solid on the left, transparent toward the right).
  - Mobile: vertical fade (solid at top) so text stays readable on the narrow layout.
- Removed the old two-column layout and the floating LIVE/chips widgets (those are part of
  the background image now).

## Note about the baked-in text
Your uploaded image already contains the logo, headline, buttons and stat cards as part of
the picture. The live overlay sits on top of that. The scrim hides the baked-in text on
normal screens, but on some sizes the image's own text may show faintly behind the live text.
If you want a 100% clean result, give me (or let me generate) a version of the image with
NO baked-in text — just the doctors/visual — and the live text will be the only text shown.

Build verified: `npm run build` succeeds.
