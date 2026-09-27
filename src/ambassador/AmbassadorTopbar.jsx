import { useState, useRef, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { Menu, Search, Bell, ChevronDown, LogOut } from 'lucide-react'
import CoverImage from '../components/CoverImage'

export default function AmbassadorTopbar({ ambassador, onOpenMobileNav }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const onClick = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-3">
      <button onClick={onOpenMobileNav} className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-50">
        <Menu size={20} />
      </button>

      {/* Decorative search — not wired up yet, kept purely visual per spec */}
      <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 max-w-xs">
        <Search size={15} className="text-gray-400" />
        <input disabled placeholder="Search…" className="bg-transparent text-sm text-gray-500 outline-none placeholder-gray-400 w-full cursor-not-allowed" />
      </div>

      <div className="flex-1 lg:flex-none" />

      <button className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 relative" title="Notifications">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#64ac37]" />
      </button>

      <div className="relative" ref={menuRef}>
        <button onClick={() => setMenuOpen(o => !o)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-50 transition-colors">
          {ambassador.imageUrl
            ? <CoverImage src={ambassador.imageUrl} alt={ambassador.name} bias="center 25%" className="w-8 h-8 rounded-full shrink-0" />
            : <div className="w-8 h-8 rounded-full bg-[#1655c3] flex items-center justify-center text-white font-bold text-xs shrink-0">{ambassador.name?.charAt(0)}</div>}
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
