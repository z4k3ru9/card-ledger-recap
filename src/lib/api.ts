// Thin wrapper around the PHP + MySQL backend under /api. Recap data now
// lives in one shared MySQL database (not per-browser localStorage), and
// login is a conventional server-side session: the browser only ever
// holds an httpOnly session cookie, backed by a `sessions` table on the
// server (see api/lib/SessionHandler.php) - there's no client-side crypto
// key to manage anymore.
import type { MonthRecap, RecapsByMonth } from './types'

// Relative (no leading slash) so this resolves under whatever subfolder
// the app itself is served from - same reasoning as `base: './'` in
// vite.config.ts.
const API_BASE = 'api'

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      body && typeof body.error === 'string' ? body.error : `Request failed (${res.status})`
    throw new ApiError(message)
  }
  return body as T
}

export interface AuthStatus {
  needsSetup: boolean
  authenticated: boolean
  /** False once the shared password has been revoked in favor of passkeys. */
  passwordEnabled: boolean
  passkeyCount: number
}

export function getStatus(): Promise<AuthStatus> {
  return request<AuthStatus>('status.php')
}

export async function setupPassword(password: string): Promise<void> {
  await request('setup.php', { method: 'POST', body: JSON.stringify({ password }) })
}

export async function login(password: string): Promise<void> {
  await request('login.php', { method: 'POST', body: JSON.stringify({ password }) })
}

export async function logout(): Promise<void> {
  await request('logout.php', { method: 'POST' })
}

export async function fetchRecaps(): Promise<RecapsByMonth> {
  const { recaps } = await request<{ recaps: RecapsByMonth }>('recaps.php')
  return recaps
}

export async function saveRecap(month: string, recap: MonthRecap): Promise<void> {
  await request('recaps.php', {
    method: 'POST',
    body: JSON.stringify({ month, recap }),
  })
}

// --- Passkeys (WebAuthn) ---------------------------------------------

export interface PasskeyInfo {
  id: string
  label: string | null
  created_at: string
  last_used_at: string | null
}

/** Raw options objects from the server - shaped for navigator.credentials.{create,get}(). */
export function getWebauthnRegisterOptions(): Promise<unknown> {
  return request('webauthn-register-options.php', { method: 'POST' })
}

export async function verifyWebauthnRegistration(body: {
  clientDataJSON: string
  attestationObject: string
  label: string
}): Promise<void> {
  await request('webauthn-register-verify.php', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function getWebauthnLoginOptions(): Promise<unknown> {
  return request('webauthn-login-options.php', { method: 'POST' })
}

export async function verifyWebauthnLogin(body: {
  id: string
  clientDataJSON: string
  authenticatorData: string
  signature: string
  userHandle: string
}): Promise<void> {
  await request('webauthn-login-verify.php', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function listPasskeys(): Promise<PasskeyInfo[]> {
  const { passkeys } = await request<{ passkeys: PasskeyInfo[] }>(
    'webauthn-credentials.php',
  )
  return passkeys
}

export async function deletePasskey(id: string): Promise<void> {
  await request('webauthn-credentials.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete', id }),
  })
}

export async function revokePassword(): Promise<void> {
  await request('revoke-password.php', { method: 'POST' })
}
