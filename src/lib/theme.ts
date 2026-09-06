export type Theme = 'light' | 'dark'

const THEME_CHANGE_EVENT = 'clr-theme-change'

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
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }))
}

/** Notifies `callback` whenever applyTheme() runs elsewhere (e.g. ThemeToggle). */
export function onThemeChange(callback: (theme: Theme) => void): () => void {
  function handler(e: Event) {
    callback((e as CustomEvent<Theme>).detail)
  }
  window.addEventListener(THEME_CHANGE_EVENT, handler)
  return () => window.removeEventListener(THEME_CHANGE_EVENT, handler)
}
