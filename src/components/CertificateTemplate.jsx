import { Award, ShieldCheck } from 'lucide-react'

/*
  Reusable certificate renderer with 4 designs.
  Props (all optional, sensible fallbacks):
    template     : 'classic' | 'modern' | 'elegant' | 'minimal'
    recipient    : string  (student name)
    title        : string  (course / webinar title)
    body         : string  (description line)
    issued       : string  (date)
    certCode     : string
    signatoryName: string
    signatoryTitle: string
    orgName      : string
  The outer wrapper is a fixed 1000x707 (A4-landscape ratio) box; scale it with
  CSS transform from the parent for thumbnails/preview.
*/

export const TEMPLATES = [
  { id: 'classic', name: 'Classic Blue' },
  { id: 'modern',  name: 'Modern Gradient' },
  { id: 'elegant', name: 'Elegant Gold' },
  { id: 'minimal', name: 'Minimal Clean' },
]

const DEFAULTS = {
  recipient: 'Recipient Name',
  title: 'Course / Webinar Title',
  body: 'has successfully completed the program and demonstrated outstanding commitment to medical excellence.',
  issued: new Date().toISOString().split('T')[0],
  certCode: 'CERT-MW-2025-XXXXX',
  signatoryName: 'Dr. Shahroz Abbas',
  signatoryTitle: 'Founder & CEO, MEDWEB-PK',
  orgName: 'MEDWEB-PK',
}

function Seal({ color = '#1655c3' }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-full"
      style={{ width: 92, height: 92, background: `linear-gradient(135deg, ${color}, #64ac37)`, color: '#fff', boxShadow: '0 8px 20px rgba(0,0,0,0.18)' }}>
      <ShieldCheck size={30} />
      <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1, marginTop: 2 }}>VERIFIED</div>
    </div>
  )
}

export default function CertificateTemplate({ template = 'classic', ...props }) {
  const d = { ...DEFAULTS, ...Object.fromEntries(Object.entries(props).filter(([, v]) => v !== '' && v != null)) }
  const base = {
    width: 1000, height: 707, position: 'relative', overflow: 'hidden',
    fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif", boxSizing: 'border-box',
  }

  // ---------- CLASSIC BLUE ----------
  if (template === 'classic') {
    return (
      <div style={{ ...base, background: '#fff', border: '14px solid #1655c3', padding: 0 }}>
        <div style={{ position: 'absolute', inset: 14, border: '2px solid #64ac37' }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Award size={28} color="#1655c3" />
            <span style={{ fontSize: 26, fontWeight: 900, color: '#1655c3' }}>MED<span style={{ color: '#64ac37' }}>WEB</span></span>
          </div>
          <div style={{ fontSize: 14, letterSpacing: 6, color: '#94a3b8', fontWeight: 700, marginBottom: 18 }}>CERTIFICATE OF COMPLETION</div>
          <div style={{ fontSize: 15, color: '#64748b', marginBottom: 6 }}>This is proudly presented to</div>
          <div style={{ fontSize: 44, fontWeight: 900, color: '#0f2d6b', margin: '6px 0 4px', fontFamily: "'Instrument Serif', serif" }}>{d.recipient}</div>
          <div style={{ width: 220, height: 3, background: 'linear-gradient(90deg,#1655c3,#64ac37)', margin: '8px 0 18px' }} />
          <div style={{ fontSize: 16, color: '#475569', maxWidth: 640, lineHeight: 1.6 }}>
            For successfully completing <b style={{ color: '#1655c3' }}>{d.title}</b> — {d.body}
          </div>
          <div style={{ position: 'absolute', bottom: 50, left: 70, right: 70, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: '#0f2d6b', fontSize: 15, borderTop: '2px solid #cbd5e1', paddingTop: 6, minWidth: 200 }}>{d.signatoryName}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{d.signatoryTitle}</div>
            </div>
            <Seal />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: '#0f2d6b', fontSize: 15, borderTop: '2px solid #cbd5e1', paddingTop: 6, minWidth: 200 }}>{d.issued}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Date of Issue</div>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 18, fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', letterSpacing: 1 }}>{d.certCode}</div>
        </div>
      </div>
    )
  }

  // ---------- MODERN GRADIENT ----------
  if (template === 'modern') {
    return (
      <div style={{ ...base, background: 'linear-gradient(135deg,#0f2d6b 0%,#1655c3 45%,#2f7d76 75%,#3f7a3a 100%)', color: '#fff' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Award size={28} color="#fff" />
            <span style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>MED<span style={{ color: '#95d348' }}>WEB</span></span>
          </div>
          <div style={{ fontSize: 13, letterSpacing: 6, color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginBottom: 20 }}>CERTIFICATE OF ACHIEVEMENT</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>Awarded to</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: '#fff', margin: '4px 0', fontFamily: "'Instrument Serif', serif" }}>{d.recipient}</div>
          <div style={{ width: 200, height: 3, background: '#95d348', margin: '10px 0 20px', borderRadius: 2 }} />
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', maxWidth: 640, lineHeight: 1.6 }}>
            For successfully completing <b style={{ color: '#95d348' }}>{d.title}</b> — {d.body}
          </div>
          <div style={{ position: 'absolute', bottom: 50, left: 70, right: 70, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 15, borderTop: '2px solid rgba(255,255,255,0.4)', paddingTop: 6, minWidth: 200 }}>{d.signatoryName}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{d.signatoryTitle}</div>
            </div>
            <Seal color="#95d348" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 15, borderTop: '2px solid rgba(255,255,255,0.4)', paddingTop: 6, minWidth: 200 }}>{d.issued}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Date of Issue</div>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 18, fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', letterSpacing: 1 }}>{d.certCode}</div>
        </div>
      </div>
    )
  }

  // ---------- ELEGANT GOLD ----------
  if (template === 'elegant') {
    return (
      <div style={{ ...base, background: '#fffdf7', border: '3px solid #caa64a' }}>
        <div style={{ position: 'absolute', inset: 16, border: '1px solid #e4cf8f' }} />
        <div style={{ position: 'absolute', inset: 22, border: '3px double #caa64a' }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 70, textAlign: 'center' }}>
          <Award size={40} color="#caa64a" style={{ marginBottom: 6 }} />
          <span style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', letterSpacing: 2 }}>MEDWEB-PK</span>
          <div style={{ fontSize: 13, letterSpacing: 7, color: '#caa64a', fontWeight: 700, margin: '16px 0 22px' }}>CERTIFICATE OF EXCELLENCE</div>
          <div style={{ fontSize: 14, color: '#8a7a52', fontStyle: 'italic', marginBottom: 4 }}>This certificate is presented to</div>
          <div style={{ fontSize: 46, fontWeight: 700, color: '#1a1a1a', margin: '6px 0', fontFamily: "'Instrument Serif', serif" }}>{d.recipient}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0 18px' }}>
            <span style={{ width: 60, height: 1, background: '#caa64a' }} />
            <span style={{ color: '#caa64a', fontSize: 16 }}>✦</span>
            <span style={{ width: 60, height: 1, background: '#caa64a' }} />
          </div>
          <div style={{ fontSize: 16, color: '#5c5240', maxWidth: 620, lineHeight: 1.7, fontStyle: 'italic' }}>
            In recognition of completing <b style={{ color: '#caa64a', fontStyle: 'normal' }}>{d.title}</b> — {d.body}
          </div>
          <div style={{ position: 'absolute', bottom: 54, left: 90, right: 90, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 15, borderTop: '1px solid #caa64a', paddingTop: 6, minWidth: 190 }}>{d.signatoryName}</div>
              <div style={{ fontSize: 11, color: '#8a7a52' }}>{d.signatoryTitle}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 15, borderTop: '1px solid #caa64a', paddingTop: 6, minWidth: 190 }}>{d.issued}</div>
              <div style={{ fontSize: 11, color: '#8a7a52' }}>Date of Issue</div>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 22, fontSize: 11, color: '#b3a06a', fontFamily: 'monospace', letterSpacing: 1 }}>{d.certCode}</div>
        </div>
      </div>
    )
  }

  // ---------- MINIMAL CLEAN ----------
  return (
    <div style={{ ...base, background: '#fff', border: '1px solid #e5e7eb' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 10, background: 'linear-gradient(90deg,#1655c3,#64ac37)' }} />
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '70px 90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
          <Award size={24} color="#1655c3" />
          <span style={{ fontSize: 22, fontWeight: 900, color: '#1655c3' }}>MED<span style={{ color: '#64ac37' }}>WEB</span></span>
        </div>
        <div style={{ fontSize: 13, letterSpacing: 3, color: '#9ca3af', fontWeight: 700, marginBottom: 14 }}>CERTIFICATE OF COMPLETION</div>
        <div style={{ fontSize: 15, color: '#6b7280', marginBottom: 2 }}>This certifies that</div>
        <div style={{ fontSize: 50, fontWeight: 900, color: '#111827', margin: '4px 0 14px', lineHeight: 1.05 }}>{d.recipient}</div>
        <div style={{ fontSize: 17, color: '#374151', maxWidth: 680, lineHeight: 1.6 }}>
          has successfully completed <b style={{ color: '#1655c3' }}>{d.title}</b> — {d.body}
        </div>
        <div style={{ marginTop: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontWeight: 800, color: '#111827', fontSize: 15 }}>{d.signatoryName}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>{d.signatoryTitle}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, color: '#111827', fontSize: 15 }}>{d.issued}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Issued</div>
          </div>
          <Seal />
        </div>
        <div style={{ marginTop: 24, fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', letterSpacing: 1 }}>Verify at medweb.pk · {d.certCode}</div>
      </div>
    </div>
  )
}
