import { Building2 } from 'lucide-react'
import { useSiteSettings } from '../hooks/useSiteSettings'
import InfiniteMarquee from '../components/InfiniteMarquee'

// Placeholder chips — replaced with real logos once the admin uploads them
// (each entry falls back to a text chip until logoImage is set — see Round 18).
const DEFAULTS = {
  partnersHeading: 'Trusted by Leading Universities & Healthcare Partners',
  partners: [
    { name: 'Partner University', logoImage: '' },
    { name: 'Medical Institute', logoImage: '' },
    { name: 'Teaching Hospital', logoImage: '' },
    { name: 'Health Sciences College', logoImage: '' },
    { name: 'Partner University', logoImage: '' },
    { name: 'Medical Institute', logoImage: '' },
    { name: 'Teaching Hospital', logoImage: '' },
  ],
}

function PartnerChip({ name, logoImage }) {
  if (logoImage) {
    return (
      <div className="flex items-center justify-center h-16 w-36 border border-gray-200 rounded-xl px-4 py-2 bg-white">
        <img src={logoImage} alt={name || 'Partner logo'} className="max-h-10 w-full object-contain" />
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2.5 border border-gray-200 rounded-xl px-5 py-3 text-gray-400 h-16">
      <Building2 size={18} className="text-gray-300 flex-shrink-0" />
      <span className="text-sm font-medium whitespace-nowrap">{name}</span>
    </div>
  )
}

export default function TrustedPartners() {
  const { partnersHeading: heading, partners: rawPartners } = useSiteSettings(DEFAULTS)
  // Back-compat: older saved data may still be plain strings, not {name, logoImage}
  const partners = rawPartners.map(p => (typeof p === 'string' ? { name: p, logoImage: '' } : p))

  return (
    <section id="partners" className="py-10 sm:py-12 px-4 bg-white border-y border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <p className="text-sm font-semibold text-gray-500 text-center sm:text-left mb-6">
          {heading}
        </p>

        <InfiniteMarquee
          items={partners}
          keyFn={(p, i) => i}
          pauseOnHover
          gap={16}
          renderItem={p => <PartnerChip name={p.name} logoImage={p.logoImage} />}
        />
      </div>
    </section>
  )
}
