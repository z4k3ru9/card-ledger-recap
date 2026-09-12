# PackTally Security Guide

## Mandatory controls

- HTTPS is required, with canonical origin and WebAuthn RP ID/origin configured exactly.
- Sessions use secure, httpOnly, same-site cookies and server-side state; session/device revocation is enforced on the next request.
- Passkeys are primary. Password fallback is disabled unless deployment configuration enables it.
- Sensitive operations require a passkey verified within 15 minutes.
- The rotating recovery secret exists only outside the app/database and is accepted only by authenticated cPanel/CLI recovery commands.
- Every mutation has an idempotency key, expected revision when mutable, server authorization, validation, and an audit event where financial/security/lifecycle relevant.
- Rate limits use trusted proxy-aware client identification; do not trust arbitrary forwarded headers.

## Receipt protection

The client crops/redacts and strips metadata before upload. Server code must sniff and decode/re-encode images, enforce five images per Expense and configured dimensions/size, use opaque storage outside the web root, and authorize every byte read. Raw input filenames, EXIF, unredacted source bytes, and direct storage URLs are not retained or exposed.

## Logs and evidence

Never write passwords, setup/recovery secrets, passkey assertions/attestations, tokens, receipt text/images, provider credentials, or full account handles to logs/evidence. Audit events are hash-chained to detect ordinary tampering but are not a legal immutability claim; hosting/database administrators remain trusted operators.

## External providers

OCR and translation default off. If enabled, select providers configured not to train on or retain input where possible, send the least necessary data, apply timeouts/bounded retries, and retain manual fallback. `GET /api/capabilities` exposes safe health states only.

## Security verification

Test authorization at the endpoint, not only the UI. Verify passkey RP/origin errors fail safely; expired/replayed invitations fail; revoked sessions cannot sync; conflict/retry errors reveal no sensitive record; restricted receipts cannot be guessed/downloaded; and logs remain secret-free.
