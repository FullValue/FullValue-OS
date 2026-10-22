/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import { applyTheme, normalizeTheme, readThemePreference, resolveTheme, SYSTEM_THEME_QUERY, THEME_KEY } from '@/lib/theme'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readThemePreference)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(SYSTEM_THEME_QUERY).matches)
  const theme = resolveTheme(preference, systemDark)

  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_THEME_QUERY)
    const onSystemChange = event => setSystemDark(event.matches)
    const onStorage = event => {
      if (event.key === THEME_KEY || event.key === null) setPreference(readThemePreference())
    }
    media.addEventListener('change', onSystemChange)
    window.addEventListener('storage', onStorage)
    return () => {
      media.removeEventListener('change', onSystemChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  function setThemePreference(value) {
    const next = normalizeTheme(value)
    setPreference(next)
    try { localStorage.setItem(THEME_KEY, next) } catch { /* The current session still follows the selected theme. */ }
  }

  return (
    <ThemeContext.Provider value={{ theme, preference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
