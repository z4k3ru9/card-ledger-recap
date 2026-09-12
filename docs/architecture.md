# PackTally Architecture

## Runtime shape

The browser receives a static React PWA. It calls a same-origin modular PHP application through `/api`; PHP owns sessions, authorization, validation, persistence, jobs, and private-file access. MySQL is the write store. cPanel cron invokes short-lived PHP jobs; Node may build assets but is not a required runtime daemon.

## Deep modules

| Module | Interface responsibility | Hidden implementation responsibility |
| --- | --- | --- |
| Authorization | Decide whether an Account may perform an action on a resource | Membership lookup, lifecycle rules, recent-passkey checks, owner reasons. |
| Money | Parse, allocate, convert, and format Money | ISO exponents, integer/decimal arithmetic, deterministic rounding. |
| Expense Ledger | Record/revise/void revisioned Expenses | Allocation validation, adjustments, tombstones, audit events. |
| Settlement | Calculate/reconcile balances and Repayments | Rate snapshots, IDR normalization, deterministic creditor matching. |
| Sync | Queue and reconcile browser operations | IndexedDB encryption, backoff, idempotency, conflicts, service-worker upgrades. |
| Receipt | Accept and authorize processed evidence | Image validation/re-encoding, private storage, provider jobs, redaction. |
| Jobs | Claim and execute durable work | Leases, retry policy, cron compatibility, health and failure summaries. |

Each Module has one external Interface; adapters vary only where a real seam exists, notably OCR/translation/rate/push/off-host backup providers.

## Persistence ownership

Identity owns Accounts, Passkeys, Sessions, Invitations, and Recovery Events. Trip Ledger owns Trips, Memberships, Expenses, Allocations, Adjustments, Settlements, Repayments, and Audit Events. Evidence owns Receipts, OCR/translation output, and private artifacts. Operations owns Migrations, Idempotency Records, Jobs, Notifications, Backup metadata, and capability health.

No module reads another module’s tables directly except through its Interface or a documented transaction owned by the write operation. IDs, not copied mutable fields, connect modules.

## Request flow

`browser → session/authentication → authorization → validation → domain module → transaction/audit/idempotency → standard envelope`. A mutation returns the recorded idempotent result when replayed. An outdated revision returns conflict data, never a partial merge.

## Offline flow

The browser encrypts account-scoped local snapshots/drafts/operations. The Sync Module sends idempotent batches after reconnection, acknowledges results, records conflicts, and leaves global save state truthful. A staged service-worker update cannot activate until pending operations are synchronized or safely migrated.

See `docs/packtally/specs/SHARED-CONTRACTS.md` for exact transport rules and `docs/packtally/specs/04-offline-pwa-and-notifications.md` for lifecycle rules.
