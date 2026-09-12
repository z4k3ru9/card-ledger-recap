# PackTally UX and User Flows

This is the screen-level companion to `PRD.md` and the stage contracts. Every screen exposes the next safe action and current save/connection state. Financial state is never implied by a spinner or toast.

## Navigation model

The authenticated shell contains `Trips`, current `Trip`, `Expenses`, `Balances`, `Activity`, `Settings`, and a global status indicator. At 320–430 px use stacked cards and bottom sheets; no primary task depends on horizontal scrolling. Desktop may use dense tables as a secondary presentation.

Global status values are `Saved`, `Saving`, `Offline—saved on this device`, `Needs attention`, and `Error`. The status persists across navigation, Trip switching, and sheets. Attention/error links to the exact item.

## First-time Owner

`Setup → Owner profile → Passkey registration → Trips empty state → Create Trip → timezone/currencies → Invite → Current Trip`.

- Wrong setup secret explains failure and creates no account. Passkey cancellation or unsupported browser offers retry or configured fallback; owner creation is atomic.
- Trip creation requires name, destination timezone, and IDR report currency. Timezone is suggested, never silently inferred; unsupported currencies are rejected before creation.
- Invitation creation returns a seven-day, single-use token for manual copy/share. Revoke/regenerate is available; raw token is not persisted.

## Contributor

`Invitation preview → Claim → Passkey registration or existing-account sign-in → Trip display name → Current Trip`.

Preview shows Owner, Trip, and destination before passkey setup. Invalid, expired, revoked, and already-claimed tokens have distinct explanations. A revoked member returns to safe access denied. Owner-only controls are hidden, not merely disabled.

## Add Expense

`Current Trip → Scan receipt | Enter manually → preprocess/redact → upload → OCR/translation review → confirm fields → payer/beneficiaries/split → save`.

Scan is prominent and manual entry equally available. OCR suggests merchant/date/currency/amount but never creates or changes an Expense without explicit field selection. Upload and save work while processing is queued, disabled, or unavailable. Equal split is the default; exact/percentage/weight are explicit alternatives with live per-person preview.

Incomplete forms remain local Drafts, excluded from totals/settlement, and appear under `Drafts` with `Continue`/`Discard`. Discard requires confirmation. Saved state is `Saving` then `Saved`, or `Offline—saved on this device`; `Rate pending` permits original-currency save.

Payer and Owner see receipt actions. Other members see no receipt link/action; whole-trip PDF says only `Receipt attached—restricted`. The stored receipt is cropped/redacted/metadata-stripped; raw pre-redaction bytes are never uploaded.

## Currency/rate states

| State | Copy | Allowed actions |
| --- | --- | --- |
| Exact date | `Estimated IDR · rate for <date> · <source>` | View provenance, owner override, reconcile later. |
| Nearest prior | `Estimated IDR · nearest available rate from <date>` | View provenance, override, retry. |
| Pending | `IDR conversion pending` | Save original currency; retry; cannot settle/close. |
| Manual | `Owner rate override · reason available` | View source/override; reconcile. |
| Statement | `Statement amount confirmed` | View estimate/actual; correction creates event. |
| Unhealthy | `Rate service unavailable` | Save original currency; retry later. |

## Owner correction and conflict

An owner editing another member’s Expense sees a before/after preview, must enter a reason, confirms, and triggers an affected-member notification. A same-Expense revision conflict opens a sheet with local/server values, actor/time, changed fields, and recalculated totals. Actions: `Keep server`, `Apply my edit`, `Edit before retry`. The queued operation is removed only after a choice; different Expenses synchronize independently.

## Offline and session flow

When unsynchronized work exists, sign-out offers `Sync now`, `Keep on this device`, and `Discard local changes`; discard requires a second confirmation. Browser close retains encrypted Drafts. Device-key loss/storage eviction is a recoverable warning. Cached Trip history requires local passkey/device reauthentication while offline. Successful sync followed by sign-out purges the account cache/key; remote revocation purges on next contact.

## Settlement

`Balances → review pending rates/conflicts/jobs → Calculate IDR settlement → inspect balances/minimized obligations → propose repayment → recipient confirms/rejects → recalculate → Close Trip`.

The UI shows original payment currency, locked IDR conversion/rate date, recipient, status, and audit history. Rejected payments remain visible with a reason; confirmed corrections use reversal records. Settling/Closed is blocked while any included Expense has pending rate, unresolved conflict/job, or invalid allocation.

## Lifecycle and deletion

Allowed transitions are `Draft → Active → Settling → Closed`. Closing requires complete rates, no conflicts/jobs, and a final settlement. Reopen is Owner-only with reason. Deletion is Owner-only: show active Trips/ownership dependencies, notify members, show a 30-day countdown, and offer Cancel. At expiry, purge Trip data, receipts, PDFs, financial Audit Events, and device caches at next contact.

## PDF and notifications

PDF flow is `Request → Queued → Generating(progress) → Ready → Download`. A4 portrait is default; explain landscape for wide settlement/activity tables. Failed jobs offer `Retry`; expired artifacts offer `Generate again`. Download requires current membership. Deep links authenticate first, then route only if access remains; deleted/revoked/expired targets show a safe explanation. Push may include merchant and concise trip summary but never a value. Push failure leaves persisted in-app notification.

## Accessibility and focus

Sheets restore focus to their trigger; if it vanished, focus moves to the first actionable error. OCR review focuses the first suggestion. Conflict resolution focuses the result and announces whether a new save is pending. Save-state changes use an accessible status region; errors identify Expense/field. Icon-only controls have names, delete actions identify merchant/Expense, date sort exposes direction, and touch targets work at 320 px.

## Traceability

Roles/lifecycle: `specs/01-identity-trips-and-audit.md`; expense/mobile: `specs/02-expense-ledger-and-mobile-ui.md`; currency/PDF: `specs/03-currency-settlement-and-pdf.md`; offline/notifications: `specs/04-offline-pwa-and-notifications.md`; receipt jobs/privacy: `specs/05-receipts-ocr-and-translation.md`; release: `specs/06-operations-and-release.md`; transport: `specs/SHARED-CONTRACTS.md` and `openapi.yaml`.
