import {
  decryptText,
  deriveKey,
  encryptText,
  fromBase64,
  randomBytes,
  toBase64,
} from './crypto'

const VAULT_KEY = 'card-ledger-recap:vault:v1'
const RECAPS_KEY = 'card-ledger-recap:recaps:v1'

// A known plaintext we can re-encrypt/decrypt to check a password is
// correct, without ever storing the password (or a reversible form of
// it) anywhere.
const VERIFIER_PLAINTEXT = 'card-ledger-recap-unlock-check'

interface VaultConfig {
  salt: string
  verifier: { iv: string; ciphertext: string }
}

function loadVaultConfig(): VaultConfig | null {
  try {
    const raw = localStorage.getItem(VAULT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveVaultConfig(config: VaultConfig) {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(config))
  } catch {
    // Storage unavailable - the vault just won't survive a reload.
  }
}

export function hasVault(): boolean {
  return loadVaultConfig() !== null
}

/** Sets a new app password and returns the derived key, ready to use. */
export async function createVault(password: string): Promise<CryptoKey> {
  const salt = randomBytes(16)
  const key = await deriveKey(password, salt)
  const verifier = await encryptText(key, VERIFIER_PLAINTEXT)
  saveVaultConfig({ salt: toBase64(salt), verifier })
  return key
}

/** Returns the derived key if the password is correct, otherwise null. */
export async function unlockVault(password: string): Promise<CryptoKey | null> {
  const config = loadVaultConfig()
  if (!config) return null
  const key = await deriveKey(password, fromBase64(config.salt))
  try {
    const decrypted = await decryptText(key, config.verifier)
    return decrypted === VERIFIER_PLAINTEXT ? key : null
  } catch {
    // AES-GCM authentication failure - wrong password.
    return null
  }
}

/**
 * Forgetting the password means the encrypted recaps can never be
 * decrypted again, so the only way out is to erase everything and
 * start over.
 */
export function resetVault() {
  try {
    localStorage.removeItem(VAULT_KEY)
    localStorage.removeItem(RECAPS_KEY)
  } catch {
    // ignore
  }
}
