// Thin client-side glue for passkey (WebAuthn) registration and login.
// The server (api/webauthn-*.php, backed by lbuchs/webauthn) does all the
// actual cryptographic verification - this file only converts between the
// base64url strings used over the wire and the ArrayBuffers the browser's
// WebAuthn API expects.
import {
  getWebauthnLoginOptions,
  getWebauthnRegisterOptions,
  verifyWebauthnLogin,
  verifyWebauthnRegistration,
} from './api'

export function isPasskeySupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials?.create === 'function' &&
    typeof navigator.credentials?.get === 'function'
  )
}

function base64UrlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (padded.length % 4)) % 4)
  const binary = atob(padded + padding)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

interface CreateOptionsJSON {
  publicKey: {
    challenge: string
    user: { id: string; name: string; displayName: string }
    excludeCredentials?: { id: string; type: string; transports?: string[] }[]
    [key: string]: unknown
  }
}

interface GetOptionsJSON {
  publicKey: {
    challenge: string
    allowCredentials?: { id: string; type: string; transports?: string[] }[]
    [key: string]: unknown
  }
}

function toCreateOptions(json: CreateOptionsJSON): CredentialCreationOptions {
  const publicKey = json.publicKey
  return {
    publicKey: {
      ...publicKey,
      challenge: base64UrlToBuffer(publicKey.challenge),
      user: { ...publicKey.user, id: base64UrlToBuffer(publicKey.user.id) },
      excludeCredentials: (publicKey.excludeCredentials ?? []).map((c) => ({
        ...c,
        id: base64UrlToBuffer(c.id),
      })),
    } as PublicKeyCredentialCreationOptions,
  }
}

function toGetOptions(json: GetOptionsJSON): CredentialRequestOptions {
  const publicKey = json.publicKey
  return {
    publicKey: {
      ...publicKey,
      challenge: base64UrlToBuffer(publicKey.challenge),
      allowCredentials: publicKey.allowCredentials?.map((c) => ({
        ...c,
        id: base64UrlToBuffer(c.id),
      })),
    } as PublicKeyCredentialRequestOptions,
  }
}

export class PasskeyError extends Error {}

/** Registers a new passkey for this browser/device. Requires an existing authenticated session. */
export async function registerPasskey(label: string): Promise<void> {
  if (!isPasskeySupported()) {
    throw new PasskeyError('This browser does not support passkeys.')
  }
  const optionsJSON = (await getWebauthnRegisterOptions()) as CreateOptionsJSON
  const options = toCreateOptions(optionsJSON)

  let credential: PublicKeyCredential
  try {
    credential = (await navigator.credentials.create(
      options,
    )) as PublicKeyCredential
  } catch (err) {
    if (err instanceof Error && err.name === 'NotAllowedError') {
      throw new PasskeyError('Passkey setup was cancelled.')
    }
    throw new PasskeyError('Could not create a passkey on this device.')
  }

  const response = credential.response as AuthenticatorAttestationResponse
  await verifyWebauthnRegistration({
    clientDataJSON: bufferToBase64Url(response.clientDataJSON),
    attestationObject: bufferToBase64Url(response.attestationObject),
    label,
  })
}

/** Signs in with an existing passkey - no password involved. */
export async function loginWithPasskey(): Promise<void> {
  if (!isPasskeySupported()) {
    throw new PasskeyError('This browser does not support passkeys.')
  }
  const optionsJSON = (await getWebauthnLoginOptions()) as GetOptionsJSON
  const options = toGetOptions(optionsJSON)

  let credential: PublicKeyCredential
  try {
    credential = (await navigator.credentials.get(
      options,
    )) as PublicKeyCredential
  } catch (err) {
    if (err instanceof Error && err.name === 'NotAllowedError') {
      throw new PasskeyError('Passkey sign-in was cancelled.')
    }
    throw new PasskeyError('Passkey sign-in failed.')
  }

  const response = credential.response as AuthenticatorAssertionResponse
  await verifyWebauthnLogin({
    id: bufferToBase64Url(credential.rawId),
    clientDataJSON: bufferToBase64Url(response.clientDataJSON),
    authenticatorData: bufferToBase64Url(response.authenticatorData),
    signature: bufferToBase64Url(response.signature),
    userHandle: response.userHandle
      ? bufferToBase64Url(response.userHandle)
      : '',
  })
}
