export const THEME_KEY = 'cockpit_theme'
export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

export function normalizeTheme(value) {
  return ['light', 'dark', 'system'].includes(value) ? value : 'system'
}

export function readThemePreference() {
  try {
    return normalizeTheme(localStorage.getItem(THEME_KEY))
  } catch {
    return 'system'
  }
}

export function resolveTheme(preference, systemDark) {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference
}

export function applyTheme(theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#161618' : '#f5f5f7')
}
