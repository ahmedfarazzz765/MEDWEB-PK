import { Facebook, Instagram, Linkedin, MessageCircle } from 'lucide-react'
import { useSiteSettings } from '../hooks/useSiteSettings'

const DEFAULTS = {
  welcomeMessage: "🎓 Welcome to MEDWEB — Pakistan's Fastest Growing Medical Education Platform",
  footerFacebook: 'https://facebook.com', footerWhatsapp: 'https://wa.me/923291692899',
  footerInstagram: 'https://instagram.com', footerLinkedin: 'https://linkedin.com',
}

export default function WelcomeBar() {
  const { welcomeMessage: message, footerFacebook, footerWhatsapp, footerInstagram, footerLinkedin } = useSiteSettings(DEFAULTS)

  const socials = [
    { Icon: Facebook, href: footerFacebook },
    { Icon: MessageCircle, href: footerWhatsapp },
    { Icon: Instagram, href: footerInstagram },
    { Icon: Linkedin, href: footerLinkedin },
  ]

  return (
    <div className="bg-[#1655c3] text-white text-xs py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
        <p className="font-medium tracking-wide flex-1 text-center sm:text-left">
          {message}
        </p>
        <div className="flex items-center gap-3">
          {socials.map(({ Icon, href }, i) => (
            <a key={i} href={href} target="_blank" rel="noreferrer"
              className="hover:text-[#95d348] transition-colors duration-200">
              <Icon size={14} />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
