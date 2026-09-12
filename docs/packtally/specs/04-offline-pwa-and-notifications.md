# Stage 4 Contract: Offline PWA and Notifications

## Objective and dependencies

Make mobile interruption safe and provide durable in-app plus optional web-push notifications. Requires stable released mutation contracts, entity revisions, tombstones, sessions, and idempotency.

## Browser persistence

IndexedDB databases are namespaced by immutable Account ID. Store `device_keys`, `entity_snapshots`, `drafts`, `operations`, `conflicts`, and `schema_version`. Each operation contains operation UUID, account/trip/entity IDs, method/route, encrypted body, expected revision, dependency IDs, state, attempts, next retry, and created time. A non-exportable WebCrypto device key encrypts values; cached trip history requires passkey/device reauthentication when offline.

## Modules and interfaces

- **Offline store module:** `open(accountId)`, `putDraft`, `enqueue`, `listPending`, `markResult`, `purgeAccount` hides IndexedDB/version/encryption details.
- **Sync module:** `run(trigger)`, `pause`, `resume`, `resolveConflict` hides ordering, backoff, idempotency, tombstones, and server reconciliation.
- **PWA update module:** `check`, `stage`, `activateWhenSafe`; activation waits while pending/conflicted operations exist.
- **Notification module:** `list`, `acknowledge`, `dismiss`, `subscribePush`, `unsubscribePush`.

## Synchronization rules

Operations replay in dependency order and independently across Expenses. Same idempotency key is retained for all retries. Retry follows the shared contract and stops after bounded exponential backoff. A `revision_conflict` moves the operation to `conflict`; the comparison sheet requires a choice and creates a new mutation rather than rewriting history. Tombstones prevent resurrection. Save state aggregates all Trips, not only the visible screen.

Explicit sign-out with unsynchronized work requires synchronize or explicit deletion. After synchronization, sign-out purges the account’s key/cache. Remote session revocation purges on next contact. Browser close retains encrypted work. Service-worker update is staged until the old queue is empty or safely migrated by a declared IndexedDB/operation-schema migration.

## Notifications and push

Persist notifications with `id, account_id, trip_id, type, summary, detail_json, severity, requires_ack, created_at, read_at, acknowledged_at, dismissed_at`. Read/dismiss synchronizes across devices. Security, deletion, conflict, and settlement notices remain until acknowledged. Push is offered on first authenticated trip experience. Lock-screen copy may include merchant and concise trip update but never value; failed push leaves the in-app record.

## Endpoints

`POST /api/sync/batch`, `GET /api/sync/changes?cursor=`, `GET/PATCH /api/notifications`, `POST/DELETE /api/push-subscriptions`, and `GET /api/capabilities`.

## Mandatory simulations

Offline edit survives browser close/reopen and produces one mutation after reconnect. Same-Expense conflict stops; different Expenses proceed. Sign-out cannot silently discard work. Revoked session cannot replay. Tombstone blocks resurrection. Service-worker upgrade preserves or deliberately resolves old operations. Failed push remains in-app and push payload contains no amount.

## Acceptance

PWA opens without APK/IPA, is usable without installation, and reveals no cached trip history before local reauthentication. The UI always shows Saved, Saving, Offline—saved on this device, Needs attention, or Error across navigation.
