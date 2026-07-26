import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import logo from '../assets/medweb.png'

// ─────────────────────────────────────────────────────────────────────────
// Placeholder motivational lines — the site owner will supply the final
// wording before launch. Purely a content array: editing these never
// requires touching any animation logic below.
// ─────────────────────────────────────────────────────────────────────────
const MOTIVATIONAL_LINES = [
  'Every great healer begins with a single lecture.',
  'Built for students who refuse to settle for less.',
  'From late-night study sessions to life-saving diagnoses.',
  'Thousands of students. One mission: better healthcare for Pakistan.',
  'Knowledge shared today is a life saved tomorrow.',
  "This is your journey. We're just getting started — together.",
]

// Sequential phase machine — each phase auto-advances to the next after its
// duration elapses (see the effect below). Total ≈ 11s, comfortably inside
// the 8–12s "cinematic but not tedious" target.
const PHASES = ['ribbon', 'door', 'logoReveal', 'colorFillAndText', 'confetti', 'welcome', 'done']
const DURATIONS = {
  ribbon: 2000,
  door: 1400,
  logoReveal: 1000,
  colorFillAndText: 3800,
  confetti: 1300,
  welcome: 1700,
}
const FADE_OUT_MS = 700

const CONFETTI_COLORS = ['#1655c3', '#64ac37', '#f59e0b', '#ef4444', '#a855f7', '#0ea5e9']

function ConfettiBurst() {
  // Generated once per mount — a fresh burst every time this phase starts.
  const pieces = useMemo(() => Array.from({ length: 70 }, (_, i) => {
    const angle = Math.random() * Math.PI * 2
    const distance = 140 + Math.random() * 260
    return {
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 60, // slight upward bias before falling
      rotate: Math.random() * 720 - 360,
      delay: Math.random() * 0.15,
      size: 6 + Math.random() * 6,
      round: Math.random() > 0.5,
    }
  }), [])

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-30">
      {pieces.map(p => (
        <motion.span
          key={p.id}
          className="absolute top-1/2 left-1/2"
          style={{ width: p.size, height: p.size, background: p.color, borderRadius: p.round ? '50%' : '2px' }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y + 320, opacity: 0, rotate: p.rotate }}
          transition={{ duration: 1.6, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

/**
 * Full-screen cinematic launch intro: ribbon untie → doors split open → 3D
 * logo reveal → color-fill wipe synced with motivational text → confetti →
 * welcome message → dissolve into the real homepage underneath.
 *
 * Toggle: Admin Panel → Homepage Sections → "Launch Intro Animation"
 * (writes `launchIntroEnabled` on the shared settings/site doc — see
 * src/admin/pages/AdminSections.jsx and src/pages/HomePage.jsx).
 */
export default function LaunchIntro({ onDone }) {
  const [phase, setPhase] = useState('ribbon')
  const [lineIndex, setLineIndex] = useState(0)

  // Lock page scroll for the duration of the sequence.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Advance through the phase machine.
  useEffect(() => {
    const duration = DURATIONS[phase]
    if (duration == null) return // 'done' has no further phase
    const idx = PHASES.indexOf(phase)
    const t = setTimeout(() => setPhase(PHASES[idx + 1]), duration)
    return () => clearTimeout(t)
  }, [phase])

  // Once "done", fade the whole overlay out, then let the parent unmount it.
  useEffect(() => {
    if (phase !== 'done') return
    document.body.style.overflow = ''
    const t = setTimeout(() => onDone?.(), FADE_OUT_MS)
    return () => clearTimeout(t)
  }, [phase, onDone])

  // Step the motivational line in lockstep with the logo's color-fill phase.
  useEffect(() => {
    if (phase !== 'colorFillAndText') return
    setLineIndex(0)
    const perLine = DURATIONS.colorFillAndText / MOTIVATIONAL_LINES.length
    let i = 0
    const interval = setInterval(() => {
      i += 1
      if (i < MOTIVATIONAL_LINES.length) setLineIndex(i)
      else clearInterval(interval)
    }, perLine)
    return () => clearInterval(interval)
  }, [phase])

  const skip = () => setPhase('done')

  const doorsOpen = phase !== 'ribbon'
  const logoVisible = phase !== 'ribbon' && phase !== 'door'
  const colorPhaseOrLater = phase === 'colorFillAndText' || phase === 'confetti' || phase === 'welcome'

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: 'radial-gradient(ellipse at center, #123a75 0%, #060b16 75%)', backdropFilter: 'blur(30px)' }}
      animate={{ opacity: phase === 'done' ? 0 : 1 }}
      transition={{ duration: FADE_OUT_MS / 1000, ease: 'easeInOut' }}
    >
      {/* ── Door panels — split open from the center, revealing the logo ── */}
      <div className="absolute inset-0 flex z-10">
        <motion.div
          className="w-1/2 h-full"
          style={{ background: 'linear-gradient(135deg,#1655c3,#0b2e6b)', borderRight: '3px solid rgba(255,255,255,0.18)', boxShadow: '8px 0 30px rgba(0,0,0,0.35)' }}
          animate={{ x: doorsOpen ? '-100%' : '0%' }}
          transition={{ duration: DURATIONS.door / 1000, ease: [0.65, 0, 0.35, 1] }}
        />
        <motion.div
          className="w-1/2 h-full"
          style={{ background: 'linear-gradient(225deg,#1655c3,#0b2e6b)', borderLeft: '3px solid rgba(255,255,255,0.18)', boxShadow: '-8px 0 30px rgba(0,0,0,0.35)' }}
          animate={{ x: doorsOpen ? '100%' : '0%' }}
          transition={{ duration: DURATIONS.door / 1000, ease: [0.65, 0, 0.35, 1] }}
        />
      </div>

      {/* ── Ribbon / bow — covers the doors until it "unties" ── */}
      <AnimatePresence>
        {phase === 'ribbon' && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Horizontal ribbon band */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 sm:h-32" style={{ background: 'linear-gradient(180deg,#ef4a5f,#c21f38)', boxShadow: '0 6px 24px rgba(0,0,0,0.35)' }} />

            {/* Bow — two loops + tails + center knot, "untying" by rotating the
                loops outward/flat and shrinking the knot before the whole
                thing fades. */}
            <div className="relative z-10 flex items-center justify-center" style={{ width: 220, height: 140 }}>
              <motion.div
                className="absolute"
                style={{ width: 90, height: 60, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', background: 'linear-gradient(135deg,#ff6b81,#c21f38)', left: 8, top: '50%' }}
                initial={{ translateY: '-50%', rotate: -18, scaleX: 1 }}
                animate={{ rotate: -70, scaleX: 0.6, opacity: 0 }}
                transition={{ duration: 1.3, delay: 0.5, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute"
                style={{ width: 90, height: 60, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', background: 'linear-gradient(225deg,#ff6b81,#c21f38)', right: 8, top: '50%' }}
                initial={{ translateY: '-50%', rotate: 18, scaleX: 1 }}
                animate={{ rotate: 70, scaleX: 0.6, opacity: 0 }}
                transition={{ duration: 1.3, delay: 0.5, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute rounded-full"
                style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#ffd166,#e8a93b)', boxShadow: '0 3px 10px rgba(0,0,0,0.3)' }}
                initial={{ scale: 1 }}
                animate={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.8, delay: 1.2, ease: 'easeIn' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3D logo reveal + color-fill wipe ── */}
      {logoVisible && (
        <motion.div
          className="relative z-20"
          style={{ perspective: 1000 }}
          initial={{ opacity: 0, scale: 0.4, rotateY: -110 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: DURATIONS.logoReveal / 1000, ease: 'easeOut' }}
        >
          <div className="relative w-36 h-36 sm:w-52 sm:h-52 drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
            {/* Flat gray/outline base */}
            <img
              src={logo}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ filter: 'grayscale(1) brightness(1.6) contrast(0.8)', opacity: 0.55 }}
            />
            {/* Full-color layer, wiped in left-to-right */}
            <motion.img
              src={logo}
              alt="MEDWEB"
              className="absolute inset-0 w-full h-full object-contain"
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: colorPhaseOrLater ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }}
              transition={{ duration: DURATIONS.colorFillAndText / 1000, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      )}

      {/* ── Motivational text, synced with the color fill ── */}
      <div className="relative z-20 mt-8 min-h-[2.5rem] flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {phase === 'colorFillAndText' && (
            <motion.p
              key={lineIndex}
              className="text-white/90 text-sm sm:text-base font-medium text-center max-w-md"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
            >
              {MOTIVATIONAL_LINES[lineIndex]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Confetti burst ── */}
      {phase === 'confetti' && <ConfettiBurst />}

      {/* ── Welcome message ── */}
      <AnimatePresence>
        {phase === 'welcome' && (
          <motion.div
            className="absolute inset-0 z-40 flex flex-col items-center justify-center text-center px-6"
            style={{ background: 'radial-gradient(ellipse at center, #123a75 0%, #060b16 75%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.h2
              className="text-white text-xl sm:text-3xl font-black mb-2 max-w-lg"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}
            >
              Welcome to MEDWEB's official website
            </motion.h2>
            <motion.p
              className="text-[#7ee08a] font-bold text-lg sm:text-2xl mb-5"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}
            >
              medwebpk.com
            </motion.p>
            <motion.p
              className="text-white/60 text-xs sm:text-sm tracking-[0.3em] uppercase"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.6 }}
            >
              Stay Tuned
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Skip ── */}
      <button
        onClick={skip}
        className="absolute bottom-5 right-5 z-50 text-[11px] font-semibold text-white/50 hover:text-white/90 border border-white/20 hover:border-white/50 rounded-full px-4 py-2 transition-colors"
      >
        Skip →
      </button>
    </motion.div>
  )
}
