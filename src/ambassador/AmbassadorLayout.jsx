import { useState } from 'react'
import AmbassadorSidebar from './AmbassadorSidebar'
import AmbassadorTopbar from './AmbassadorTopbar'

// Shared chrome for every /ambassador/* page once signed in — sidebar +
// topbar around whatever page-specific content is passed as children
// (AmbassadorDashboard.jsx, or ComingSoonPage.jsx for the not-yet-built
// nav items), so the portal reads as one consistent app rather than a
// single one-off dashboard page.
export default function AmbassadorLayout({ active, ambassador, children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f7f9fc] font-poppins flex">
      <AmbassadorSidebar active={active} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <AmbassadorTopbar ambassador={ambassador} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
