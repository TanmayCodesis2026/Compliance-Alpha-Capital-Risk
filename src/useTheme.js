import { useState, useEffect, useCallback } from 'react'

// Shared light/dark theme, persisted to localStorage so it survives reloads
// and stays in sync between the Login screen (outside App.jsx) and the app
// shell itself. Default matches App.jsx's prior hardcoded default ('dark').
const KEY = 'rt_theme'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY)
      return stored === 'light' || stored === 'dark' ? stored : 'dark'
    } catch {
      return 'dark'
    }
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, theme) } catch { /* storage unavailable */ }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }, [])

  return [theme, toggleTheme]
}
