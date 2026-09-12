# PackTally Product Requirements Document

## Product

PackTally is a mobile-first, browser-delivered shared travel-expense ledger. A trip owner invites up to ten named participants; participants record their own expenses and the owner can correct any entry with an attributable history. PackTally is not a payment processor. It calculates balances and records payments made elsewhere.

The pre-PackTally monthly JSON data becomes a read-only Legacy Recaps archive. It is never guessed into participant-aware Trips.

## Product goals

- Make it effortless to record a receipt or expense on a 320–430 px phone.
- Keep the original expense currency while providing transparent IDR estimates and an IDR final recap.
- Make every displayed total, save state, conversion, edit, and settlement explainable.
- Work through routine mobile interruption: connection loss, app switching, browser closing, and later reconnection.
- Produce an A4-printable PDF that is sufficient to understand the closed trip.

## Non-goals for the first release

- Processing payments, banking integrations, or legal/accounting verification.
- Native APK/IPA distribution.
- Mandatory receipt translation or push delivery; both must degrade safely.
- Unlimited participants. The supported target is ten participants and 10,000 expenses per trip, loaded in pages/date groups.

## Roles and permissions

| Role | May do |
| --- | --- |
| Owner | Create/close/reopen/archive trip; invite/revoke members; read/export whole trip; edit/delete every entry with a required reason; approve settlement and ownership transfer. |
| Contributor | Create/edit/delete own entries; view trip totals, activity, and whole-trip PDF; propose/confirm own repayments. |
| Verified operator | Perform documented owner/passkey recovery only; every action is immutable in the audit history. |

An owner’s cross-person modification must record actor, time, before/after state, and reason. Ownership is never transferred silently.

## Expense, currency, and settlement rules

- An expense records payer, beneficiaries, original amount, original currency, expense date, allocation, receipt references, and an immutable conversion snapshot.
- A trip’s final reporting currency is IDR. Debts remain visible in their trip currency while each has an estimated IDR equivalent.
- IDR is the only canonical settlement ledger. Original-currency balances are explanatory; all authoritative balances must sum exactly to zero IDR.
- Rate lookup uses the expense date. If unavailable, use the nearest earlier source rate and label it estimated. Owner overrides preserve source rate, override value, actor, and reason.
- Support equal and exact-amount splits first; percentage and weighted splits are allowed after these are complete. Remainder minor units are allocated deterministically in stable participant order and shown before save.
- Refunds are linked negative adjustments. Card fees, FX fees, tips, and discounts are linked adjustments, not hidden edits.
- Statement reconciliation may replace the estimate with an actual IDR amount while preserving both values.
- A deterministic debtor-to-creditor algorithm minimizes transfers and always displays the underlying balances.
- A proposed repayment does not reduce debt until the recipient confirms it. Later correction uses a new reversing record.

## Trip lifecycle

`Draft → Active → Settling → Closed`. Closed trips are read-only. An owner can explicitly reopen one; that action and its reason appear in activity history. Only the Owner may initiate deletion; participants are notified and the Owner may cancel during the visible 30-day recovery period. Permanent deletion removes the Trip, receipts, PDFs, and financial Audit Events. Receipts are retained while the Trip exists. A deleted Account leaves only its first name and immutable internal membership reference in Trips that must retain financial history.

## Mobile UX requirements

- Expense cards—not horizontally scrolling tables—are the default phone presentation. Desktop may use a denser table.
- A primary **Add expense** action is always visible. The UI never relies on editing an implicit blank row.
- A global save state remains visible across trip/screen changes: Saved, Saving, Offline—saved on this device, Needs attention, or Error.
- Conflict resolution, settlement confirmation, and destructive actions use a focused bottom sheet. Toasts are reserved for transient non-critical outcomes.
- A compact sticky trip summary avoids repeating the same total in several places.
- Icon-only buttons have accessible names; row actions identify their expense; controls meet touch target and keyboard/screen-reader requirements.

## Receipts and translation

- Up to five images per expense, approximately 1 MB each after preprocessing.
- Browser-side preprocessing strips metadata, allows crop/redaction, resizes/compresses, then the server revalidates type/dimensions and stores opaque random filenames outside the public web root. This processed/redacted image is the stored original; pre-redaction bytes are never uploaded.
- OCR is a priority feature. It may suggest merchant, date, currency, and total but must require review before writing an expense. Upload/manual entry must still work when OCR/translation fails.
- Preserve original image and OCR text. Translation output defaults to English with Indonesian as an optional secondary language. External processing is controlled by deployment configuration; users see safe manual fallback whenever it is off/unavailable.

## Authentication, privacy, and notifications

- Passkey-first accounts; password fallback is disabled unless deployment configuration enables it. The private setup secret bootstraps the first Owner; contributors claim seven-day, single-use, hashed invitation tokens and create a passkey.
- Trusted-device sessions roll for 30 days. Users can inspect/revoke active sessions. Sensitive settings, ownership transfer, deletion, and recovery require passkey verification within 15 minutes.
- Lost-device recovery is CLI/cPanel-only, requires a rotating high-entropy secret stored outside the site/database, resets passkeys after operator verification, and creates a 90-day security event.
- HTTPS is mandatory. Secrets remain outside Git; receipts are non-public; logs exclude credentials, tokens, passkey material, and receipt contents; backups are encrypted.
- Web push is offered at first use, never assumed. Lock-screen copy may include a merchant and concise trip update but no value. Failed push remains as in-app notification.
- In-app notifications are persisted, summarized, and expandable into detail; normal saves do not generate noise.

## Hosting and reliability

- Production target: static React build + modular PHP/MySQL application on cPanel with 1 GB RAM. Node is build-time or explicitly supported short-lived task tooling, not a required permanent server.
- Service worker caches the app shell and local durable drafts/queued edits. The API synchronizes on reconnection and rejects conflicts for explicit review.
- External rate, OCR, translation, and push services require timeouts, bounded retries, cache/fallback behavior, and health status. A cPanel scheduled task may claim durable database jobs; no permanent worker is assumed.
- Deployment configuration alone enables external features. OCR/translation default off; the database may report observed capability health but cannot enable providers.
- Database migrations are versioned, idempotent, and verified before the compatible frontend/API is exposed. Encrypted off-host backups retain seven daily and four weekly restore points; keys are stored separately and restore is simulated monthly.
- Collections page at 50 items and target p95 under two seconds. A 10,000-Expense PDF is a private background job targeting five minutes and 256 MB, with 24-hour output retention.

## Contract authority

Before first production release, the legacy API may be replaced completely. The released OpenAPI 3.1 document then becomes authoritative. Every mutation is idempotent and revision-aware; post-launch breaking changes require an explicit compatibility/version path. See `docs/packtally/specs/SHARED-CONTRACTS.md`.

## Definition of done

No launch until the data-loss, concurrency, migration, financial-precision, responsive-layout, and accessibility blockers in the audit are fixed. Automated checks are optional for narrow changes, but a simulation is mandatory when a change affects schema, permissions, money/rates, sync/offline, authentication, or service-worker behavior.
