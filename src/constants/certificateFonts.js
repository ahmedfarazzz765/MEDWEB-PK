// Curated, certificate-appropriate font list for the Name field in the
// Certificate Template editor — a mix of elegant serif and script/cursive
// styles similar to what Canva offers for certificate designs. `google` is
// the exact Google Fonts family name (used both for the <link> in index.html
// and for document.fonts.load()); `css` is the full font-family value used
// for ctx.font / inline style. The first entry (no `google`) is the existing
// system-font default — kept so certificates created before this feature
// still render byte-identical.
export const CERTIFICATE_FONTS = [
  { label: 'Default (System)', css: 'Helvetica, Arial, sans-serif', google: null, bold: true },
  { label: 'Playfair Display', css: '"Playfair Display", serif', google: 'Playfair Display', bold: false },
  { label: 'Cormorant Garamond', css: '"Cormorant Garamond", serif', google: 'Cormorant Garamond', bold: false },
  { label: 'Marcellus', css: 'Marcellus, serif', google: 'Marcellus', bold: false },
  { label: 'Alex Brush', css: '"Alex Brush", cursive', google: 'Alex Brush', bold: false },
  { label: 'Great Vibes', css: '"Great Vibes", cursive', google: 'Great Vibes', bold: false },
  { label: 'Dancing Script', css: '"Dancing Script", cursive', google: 'Dancing Script', bold: false },
  { label: 'Tangerine', css: 'Tangerine, cursive', google: 'Tangerine', bold: false },
]

export const DEFAULT_CERT_FONT = CERTIFICATE_FONTS[0].css
