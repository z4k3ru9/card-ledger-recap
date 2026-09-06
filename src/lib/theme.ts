export type Theme = 'light' | 'dark'

export function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem('theme', theme)
  } catch {
    // localStorage unavailable - theme just won't persist across reloads.
  }
}
