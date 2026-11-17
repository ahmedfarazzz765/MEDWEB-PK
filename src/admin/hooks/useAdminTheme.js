import { useEffect, useState } from 'react'

const STORAGE_KEY = 'admin-theme' // 'light' | 'dark'

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

// Default = system preference; once the admin picks a side via the toggle,
// that choice is remembered in localStorage and wins over the system
// setting on every later visit.
export default function useAdminTheme() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : (systemPrefersDark() ? 'dark' : 'light')
  })

  useEffect(() => { applyTheme(theme) }, [theme])

  const toggleTheme = () => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }

  return { theme, toggleTheme }
}
