import logoWebp from '../assets/medweb.webp'
import logoPng from '../assets/medweb-logo.png'

// The one logo usage that keeps a real PNG fallback (<picture>) — every
// other image in src/assets went WebP-only since browsers without WebP
// support are no longer a practical concern, but the logo appears on
// every page so it gets the extra safety net.
export default function Logo({ className, alt = 'MEDWEB', ...props }) {
  return (
    <picture>
      <source srcSet={logoWebp} type="image/webp" />
      <img src={logoPng} alt={alt} className={className} {...props} />
    </picture>
  )
}
