# MEDWEB — Changes (Round 6): Blue→Teal→Green gradient on solid CTAs

Took the diagonal gradient from the "Verified Certificates" card and applied it to the
prominent solid-color buttons / CTA fills.

## The gradient
`linear-gradient(135deg, #217bb4 0%, #468da6 35%, #51928c 55%, #7ab653 100%)`
(blue → teal → green, sampled from the card image)

Added a reusable utility class in `src/index.css`:
- `.brand-gradient` and `.brand-gradient-hover` (so it's easy to reuse/tweak later)

## Where applied (solid fills → gradient)
- Hero → "Explore Courses" button (`Hero.jsx`)
- Founder section → "Read Full Message" button (`FounderMessage.jsx`)
- Who We Are → "Learn More" button (`WhoWeAre.jsx`)

## Intentionally left as-is
- "Join Webinar" stays solid green for contrast (matches the mockup's 2-button look).
- Outline buttons (View All Courses, Give Feedback) + slider arrow nav — these are
  border/hover styles, not solid fills, so the gradient doesn't apply.
- Surfaces that were already a blue→green gradient (registration page header/submit,
  dynamic form header/submit, ambassador table header/apply) were left on their existing
  gradient to avoid over-using the same 3-stop blend everywhere.

Build verified: `npm run build` succeeds.
