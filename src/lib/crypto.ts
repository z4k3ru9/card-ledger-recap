// Thin wrapper around the Web Crypto API: PBKDF2 to turn a password into
// an AES-256-GCM key, plus base64-safe encrypt/decrypt of text. No secret
// (password or key) is ever written to storage - only ciphertext, an IV,
// and the PBKDF2 salt are persisted.
const PBKDF2_ITERATIONS = 250_000

// Backed by a concrete ArrayBuffer (not just ArrayBufferLike) so these
// satisfy Web Crypto's BufferSource parameters directly.
function newBytes(length: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new ArrayBuffer(length))
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(newBytes(length))
}

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64)
  const bytes = newBytes(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export interface EncryptedPayload {
  iv: string
  ciphertext: string
}

export async function encryptText(
  key: CryptoKey,
  plaintext: string,
): Promise<EncryptedPayload> {
  const iv = randomBytes(12)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return {
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  }
}

/** Throws if the key/IV don't produce valid, authenticated plaintext. */
export async function decryptText(
  key: CryptoKey,
  payload: EncryptedPayload,
): Promise<string> {
  const plaintextBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.ciphertext),
  )
  return new TextDecoder().decode(plaintextBuf)
}
