// Theme follows the OS/browser light-dark preference directly - no manual
// toggle, no stored override. index.html applies the initial class before
// paint (to avoid a flash); watchSystemTheme() keeps it in sync if the OS
// preference changes while the page stays open.
export type Theme = 'light' | 'dark'

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

/**
 * Keeps `<html class="dark">` in sync with the OS preference for as long
 * as the page stays open, and notifies `callback` on each change. Returns
 * an unsubscribe function.
 */
export function watchSystemTheme(callback: (theme: Theme) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mql = window.matchMedia(DARK_QUERY)
  function handler(e: MediaQueryListEvent) {
    const theme: Theme = e.matches ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', theme === 'dark')
    callback(theme)
  }
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}
