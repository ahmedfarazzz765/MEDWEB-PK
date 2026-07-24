# MEDWEB — Changes (Round 7)

1. **Stats cards moved before "A Vision for Every Student"**
   The four stat cards (15,000+ / 100+ / 20+ / 50+) are now a standalone band placed
   directly after the Hero and BEFORE the Founder Message ("A Vision for Every Student").
   - Removed the duplicate stats row that was inside the Hero (`Hero.jsx`).
   - Re-added `Stats.jsx` to the homepage (`HomePage.jsx`).
   - Stats now read from the public `settings/site` doc (editable in Admin → Site Content →
     Hero Stats), so they load for visitors without login.

2. **Webinar cards normalized**
   Cards now have a fixed poster height (h-44) and a capped width (max-w-340px, centered),
   so every card is the same size regardless of the uploaded image proportions — no more
   stretched/oversized cards. (`WebinarsSlider.jsx`)

3. **Footer gradient changed**
   From the old navy→blue→dark-green to a cleaner deep **blue→teal→green**
   (#103a63 → #1a5b87 → #2f7d76 → #3f7a3a) that matches the brand gradient. (`Footer.jsx`)

4. **Removed "5+ Years of Excellence" badge** from the Who We Are image. (`WhoWeAre.jsx`)

5. **Courses fetch from Firebase**
   Featured Courses already pull from Firestore (`coursesService.listen`). Made the filter
   more robust: it now shows every course that isn't explicitly Inactive/Draft/Hidden
   (previously it required status === 'Active', so courses without that exact value were
   hidden). Add courses in Admin → Courses and they appear automatically. (`CoursesHighlight.jsx`)

Build verified: `npm run build` succeeds.
