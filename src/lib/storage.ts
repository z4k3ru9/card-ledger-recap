import { decryptText, encryptText, type EncryptedPayload } from './crypto'
import type { RecapsByMonth } from './types'

const STORAGE_KEY = 'card-ledger-recap:recaps:v1'

// Each month gets its own recap automatically, kept in this browser's
// localStorage - encrypted with the vault key so switching months (or
// reloading) never loses data, and the data at rest isn't plaintext.
// There's no backend, so this is per-browser, not synced across devices.
export async function loadRecaps(key: CryptoKey): Promise<RecapsByMonth> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const payload: EncryptedPayload = JSON.parse(raw)
    const json = await decryptText(key, payload)
    const parsed = JSON.parse(json)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export async function saveRecaps(
  key: CryptoKey,
  recaps: RecapsByMonth,
): Promise<void> {
  try {
    const payload = await encryptText(key, JSON.stringify(recaps))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Storage unavailable (private mode, quota, etc.) - data just won't
    // persist across reloads, the app still works for the session.
  }
}
