import type { RecapsByMonth } from './types'

const STORAGE_KEY = 'card-ledger-recap:recaps:v1'

// Each month gets its own recap automatically, kept in this browser's
// localStorage so switching months (or reloading) never loses data -
// there's no backend, so this is per-browser, not synced across devices.
export function loadRecaps(): RecapsByMonth {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveRecaps(recaps: RecapsByMonth) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recaps))
  } catch {
    // Storage unavailable (private mode, quota, etc.) - data just won't
    // persist across reloads, the app still works for the session.
  }
}
