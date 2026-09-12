# Stage 1 Contract: Identity, Trips, Membership, and Audit

## Objective and dependencies

Replace shared authentication with passkey-first Accounts and owner/contributor Trips. Requires Stage 0 migration, backup, health, and cutover facilities plus `SHARED-CONTRACTS.md`.

## Persistence

- `accounts(id, login_handle unique, first_name, status active|recovery|deleted, created_at, deleted_at)`.
- `passkeys(id, account_id, credential_id unique, public_key, sign_count, label, created_at, last_used_at, revoked_at)`.
- `sessions(id, account_id, credential_version, trusted_device, last_activity_at, expires_at, revoked_at)`.
- `trips(id, owner_account_id, name, destination_timezone, report_currency='IDR', lifecycle draft|active|settling|closed|deleting, revision, created_at, closed_at, deletion_due_at)`.
- `trip_members(id, trip_id, account_id, role owner|contributor, display_name, state invited|active|left|revoked, joined_at, left_at, revision)`.
- `invitations(id, trip_id, created_by, token_hash, expires_at, claimed_by, claimed_at, revoked_at)`; raw tokens are never stored.
- `audit_events(id, trip_id nullable, account_id nullable, actor_id nullable, event_type, entity_type, entity_id, before_json, after_json, reason, previous_hash, event_hash, created_at)`.
- `recovery_events(id, target_account_id, operator_label, action, event_hash, created_at, purge_after)`.

## Modules and interfaces

- **Identity module:** `bootstrapOwner(setupSecret, handle, firstName, passkeyAttestation)`, `claimInvitation(token, handle, firstName, passkeyAttestation)`, `authenticate(assertion)`, `revokeSession(sessionId)`.
- **Authorization module:** `authorize(actor, action, resource): Decision`; it is the only server seam for role decisions.
- **Trip module:** `create`, `invite`, `revokeMember`, `transferOwnership`, `transitionLifecycle`, `requestDeletion`, `cancelDeletion`.
- **Audit module:** `append(event)` computes and stores the hash chain in the same transaction as the mutation.
- **Recovery module:** CLI only; `resetPasskeys(accountId, recoverySecret, operatorLabel)` rotates the recovery secret and creates a recovery event.

## Behavior and authorization

- Bootstrap works once through CLI/private setup secret. Invitation tokens are single-use, expire after seven days, and are manually shared.
- New accounts are passkey-only. Password fallback exists only when deployment configuration enables it.
- Trusted sessions use a rolling 30-day expiry. Ownership transfer, recovery, passkey/session changes, and deletion require passkey authentication no older than 15 minutes.
- Contributors control their own future Expenses; Owner cross-person mutations require a reason and notify the affected member.
- Account deletion is blocked by owned/unsettled Trips until resolution/transfer. Afterwards login/recovery identifiers are erased, while trip display retains first name plus hidden immutable member ID.
- Trip deletion is Owner-only, announces a 30-day countdown, can be cancelled, and removes dependent records/caches on completion.

## Endpoints

`POST /api/setup/owner`, `POST /api/invitations/{token}/claim`, `POST /api/auth/options`, `POST /api/auth/verify`, passkey registration/revocation under `/api/passkeys`, `GET/DELETE /api/sessions`, `DELETE /api/accounts/me`, `GET/POST /api/trips`, `GET/PATCH /api/trips/{id}`, `POST /api/trips/{id}/invitations`, `DELETE /api/invitations/{id}`, `PATCH /api/trips/{id}/members/{memberId}`, `POST /api/trips/{id}/lifecycle`, `POST/DELETE /api/trips/{id}/deletion`, and `GET /api/trips/{id}/audit` follow shared envelopes/idempotency.

## Mandatory simulations

Contributor cross-person edit is forbidden server-side. Owner edit without reason fails. Replayed/expired/revoked invitation fails. Ownership transfer without recent passkey fails. Session revocation blocks the next request. Recovery is unreachable over HTTP and rotates its secret. Hash-chain validation detects a changed event. Deleting an account preserves first-name trip attribution but removes credentials.

## Acceptance

No shared account remains. All role transitions, recovery, account deletion, and trip lifecycle operations are attributable and tested. Legacy Recaps are owned by bootstrap Owner and remain immutable.
