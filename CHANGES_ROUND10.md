# MEDWEB — Changes (Round 10): Hero background fixed

## Problem (from your screenshot)
On mobile the hero image was rendering as a SEPARATE stacked block below the buttons,
and the baked-in text/buttons from the picture clashed with the live ones.

## Fix
1. **True CSS background.** The hero now uses `background-image` (not an `<img>` tag),
   so the picture is always BEHIND the content and can never stack/separate — desktop and mobile.
2. **Text-free image.** Created `src/assets/hero_clean.jpeg` — your banner cropped to just
   the doctors photo, with the baked-in "Connecting Medical Minds" headline, the buttons,
   and the stat cards removed. So your LIVE text + buttons are the only ones shown (no duplicates).
3. **Readability scrim** over the background (fade from left on desktop, from top on mobile)
   keeps the live headline/sub-text crisp.
4. Background positioned `right center` so the doctors stay visible while text sits on the
   clearer left area.

`src/sections/Hero.jsx` updated. Build verified: `npm run build` succeeds.

> If you'd prefer an even cleaner look, you can replace `hero_clean.jpeg` with any
> text-free medical background of the same style and it'll just work.
