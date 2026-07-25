import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, Search } from 'lucide-react'
import { useSiteSettings } from '../hooks/useSiteSettings'
import logo from '../assets/medweb.png'

const DEFAULTS = {
  navTagline: 'Connecting Medical Minds',
  navLinks: [
    { label: 'Home', href: '#home' },
    { label: 'Courses', href: '#courses-highlight' },
    { label: 'Webinars', href: '#webinars' },
    { label: 'Ambassador Program', href: '#ambassadors' },
    { label: 'Our Team', href: '/team' },
    { label: 'Certificates', href: '#certificates' },
    { label: 'Blog', href: '#blog' },
    { label: 'Contact', href: '#contact' },
  ],
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { navTagline: tagline, navLinks } = useSiteSettings(DEFAULTS)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLinkClick = (e, href) => {
    if (href.startsWith('/')) {
      e.preventDefault()
      setMenuOpen(false)
      navigate(href)
      return
    }

    if (!href.startsWith('#')) return
    if (location.pathname === '/') return // Native scroll fine when on homepage
    e.preventDefault()
    setMenuOpen(false)
    navigate('/' + href)
  }

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 relative ${
        scrolled
          ? 'bg-white/96 backdrop-blur-md shadow-md py-2'
          : 'bg-white py-3 border-b border-gray-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">

          {/* Logo + Brand Name */}
          <a href="#home" onClick={e => handleLinkClick(e, '#home')} className="flex items-center gap-2.5 flex-shrink-0">
            <img
              src={logo}
              alt="MEDWEB Logo"
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
            />

            <span className="flex flex-col leading-none">
              <span className="text-2xl sm:text-[26px] font-extrabold tracking-wide">
                <span className="text-[#1655c3]">MED</span><span className="text-[#64ac37]">WEB</span>
              </span>
              <span className="text-[11px] font-medium text-gray-500 tracking-wide mt-0.5">
                {tagline}
              </span>
            </span>
          </a>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={e => handleLinkClick(e, link.href)}
                className="px-3 py-2 text-[13px] font-semibold text-gray-700 hover:text-[#1655c3] rounded-lg hover:bg-blue-50 transition-all duration-200 whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Search Box */}
          <div className="hidden xl:flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 w-44 xl:w-52 flex-shrink-0">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search anything..."
              readOnly
              className="bg-transparent text-[13px] text-gray-500 placeholder-gray-400 outline-none w-full cursor-default"
            />
          </div>

          {/* Admin Login Button */}
          <a
            href="/admin/login"
            className="hidden lg:inline-flex items-center whitespace-nowrap text-xs font-bold px-4 py-2 rounded-full border border-gray-200 text-gray-600 hover:border-[#1655c3] hover:text-[#1655c3] transition-all duration-200 flex-shrink-0"
          >
            🛡 Admin Login
          </a>

          {/* Mobile Menu Toggle Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <X size={22} className="text-gray-700" />
            ) : (
              <Menu size={22} className="text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {menuOpen && (
          <div className="lg:hidden mt-2 pb-4 border-t border-gray-100 pt-3 bg-white rounded-2xl shadow-xl px-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block px-3 py-2.5 text-sm font-semibold text-gray-700 hover:text-[#1655c3] hover:bg-blue-50 rounded-lg transition-all"
                onClick={e => handleLinkClick(e, link.href)}
              >
                {link.label}
              </a>
            ))}

            <a
              href="/admin/login"
              onClick={() => setMenuOpen(false)}
              className="block mt-3 text-center py-2.5 rounded-lg text-xs font-bold text-gray-600 border border-gray-200"
            >
              🛡 Admin Login
            </a>
          </div>
        )}
      </div>

      {/* Dual-Color Tilted Bottom Accent Line (Green #64ac37 + Blue #1655c3) */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden bg-[#64ac37]">
        <div
          className="absolute inset-0 bg-[#1655c3]"
          style={{ clipPath: 'polygon(45% 0, 100% 0, 100% 100%, 55% 100%)' }}
        />
      </div>
    </nav>
  )
}
