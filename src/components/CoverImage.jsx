import { toOptimizedUrl } from '../firebase/cloudinary'

// Drop-in replacement for the `<img className="w-full h-full object-cover" />`
// pattern used all over the site — one shared spot for the "make an
// uploaded image of ANY aspect ratio fill its container cleanly, cropped and
// centered, never stretched/squished" rule, instead of re-typing slightly
// different inline classes in every section and risking the same bug
// resurfacing somewhere new later.
//
// `bias` lets a people-photo (team, ambassador, testimonial, speaker,
// instructor, founder) crop from a face-aware point instead of a flat
// center — faces usually sit in the upper portion of a portrait, so
// "center top" or "50% 20%" keeps the face in frame instead of centering on
// a chest/torso. Leave it at the default "center" for anything that isn't a
// portrait (posters, thumbnails, covers).
//
// Assumes the parent element already establishes the box (fixed size or
// aspect-ratio, `relative`/`overflow-hidden` as needed) — same contract the
// existing `w-full h-full object-cover` call sites already relied on, so
// this swaps in without needing to restructure surrounding markup.
// NOTE: unlike a typical wrapper, this does NOT hardcode sizing classes
// (w-full h-full) — callers pass their own full className (sizing, radius,
// hover effects, etc), same as the raw <img> it replaces. Mixing a
// hardcoded `w-full`/`h-full` here with a caller's own `w-20 h-20` would be
// a Tailwind specificity gamble (both target the same CSS property; which
// one wins depends on stylesheet generation order, not className order) —
// so sizing always stays 100% under the caller's control.
//
// `src` is passed through toOptimizedUrl() (Cloudinary f_auto,q_auto) so
// every photo rendered through this component is auto-compressed/served as
// WebP/AVIF where supported, instead of whatever raw format was uploaded —
// the single biggest fix for the site's PageSpeed image-delivery warning,
// since this component is already the shared render path for team, blog,
// webinar, course, testimonial, event and announcement images. Safe no-op
// on non-Cloudinary src values (local assets, data URLs, etc).
export default function CoverImage({ src, alt = '', bias = 'center', className = '', style, loading = 'lazy', decoding = 'async', ...rest }) {
  return (
    <img
      src={toOptimizedUrl(src)}
      alt={alt}
      loading={loading}
      decoding={decoding}
      className={`object-cover ${className}`}
      style={{ objectPosition: bias, ...style }}
      {...rest}
    />
  )
}
