# MEDWEB-PK — React Website

## Quick Start

```bash
npm install
npm run dev
```

Open: http://localhost:5173

## Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
 ├── components/       # Reusable UI (Navbar)
 ├── sections/         # Page sections
 │   ├── WelcomeBar.jsx
 │   ├── Hero.jsx
 │   ├── Stats.jsx
 │   ├── WhoWeAre.jsx
 │   ├── CoursesHighlight.jsx
 │   ├── WebinarsSlider.jsx
 │   ├── WhyMedweb.jsx
 │   ├── FounderMessage.jsx
 │   ├── Testimonials.jsx
 │   ├── Ambassadors.jsx
 │   ├── CertificateVerification.jsx
 │   ├── LatestBlog.jsx
 │   └── Footer.jsx
 ├── pages/
 │   └── HomePage.jsx
 ├── App.jsx
 ├── main.jsx
 └── index.css
```

## Tech Stack
- React 18 + Vite
- Tailwind CSS
- Framer Motion (animations)
- Swiper JS (sliders)
- React Router DOM
- Lucide React (icons)
