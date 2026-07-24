# MEDWEB — Changes (Round 5): Color scheme to match mockup

Matched the uploaded full-page mockup. Your blue (#1655c3) and green
(#64ac37 / #95d348) primaries were already correct, so changes are targeted to the
spots where the mockup actually differs:

1. **Why MEDWEB cards** → now use the mockup's muted **teal-green** family
   (#4d9595 / #3f8791 / #3b848c / #2f6f78) instead of the old bright blue/green gradients.
   `src/sections/WhyMedweb.jsx`

2. **Certificate Verification box** → now a soft **pastel blue→green** gradient
   (#bcdbf3 → #c6eebe) with dark navy text and a solid green "Verify Now" button,
   matching the mockup (was a strong blue→green gradient with white text).
   `src/sections/CertificateVerification.jsx`

3. **Hero gradient** → tuned to the exact mockup-sampled pastel values
   (#bcdbf3 → #cce6f0 → #cdeecb → #c6eebe). `src/sections/Hero.jsx`

Everything else (Stats, Who We Are, Courses, Founder, Testimonials, Footer, buttons,
links) already used the matching blue/green from earlier rounds and was left intact.
The admin panel colors were not changed (internal tool, not part of the mockup).

Build verified: `npm run build` succeeds.
