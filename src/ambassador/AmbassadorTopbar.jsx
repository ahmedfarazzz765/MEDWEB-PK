import { useState, useRef, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { Menu, Search, Bell, ChevronDown, LogOut } from 'lucide-react'
import CoverImage from '../components/CoverImage'
import logo from '../assets/medweb.png'

export default function AmbassadorTopbar({ ambassador, onOpenMobileNav }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const onClick = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-5">
      <button onClick={onOpenMobileNav} className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-50 shrink-0">
        <Menu size={20} />
      </button>

      {/* Brand mark — same logo/tagline used site-wide (AdminLogin.jsx, email
          templates: "Connecting Medical Minds") */}
      <div className="flex items-center gap-2.5 shrink-0">
        <img src={logo} alt="MEDWEB" className="w-9 h-9 object-contain" />
        <div className="hidden sm:block leading-tight">
          <div className="font-black text-[#0B1220] text-sm">MEDWEB<span className="text-[#64ac37]">-PK</span></div>
          <div className="text-[10px] text-gray-400 font-medium">Connecting Medical Minds</div>
        </div>
      </div>

      {/* Decorative search — not wired up yet, kept purely visual per spec */}
      <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 flex-1 max-w-sm mx-auto">
        <Search size={15} className="text-gray-400" />
        <input disabled placeholder="Search anything…" className="bg-transparent text-sm text-gray-500 outline-none placeholder-gray-400 w-full cursor-not-allowed" />
      </div>

      <div className="flex-1 md:flex-none" />

      <button className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 relative shrink-0" title="Notifications">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#64ac37]" />
      </button>

      <div className="relative shrink-0" ref={menuRef}>
        <button onClick={() => setMenuOpen(o => !o)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-50 transition-colors">
          {ambassador.imageUrl
            ? <CoverImage src={ambassador.imageUrl} alt={ambassador.name} bias="center 25%" className="w-8 h-8 rounded-full shrink-0" />
            : <div className="w-8 h-8 rounded-full bg-[#0B1220] flex items-center justify-center text-white font-bold text-xs shrink-0">{ambassador.name?.charAt(0)}</div>}
          <span className="hidden sm:block text-sm font-semibold text-[#1a1a1a] max-w-[120px] truncate">{ambassador.name}</span>
          <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-40">
            <div className="px-3.5 py-2 border-b border-gray-50">
              <div className="text-sm font-bold text-[#1a1a1a] truncate">{ambassador.name}</div>
              <div className="text-xs text-gray-400 truncate">{ambassador.email}</div>
            </div>
            <button onClick={() => signOut(auth)} className="w-full flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
