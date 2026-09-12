# PackTally Staged Specifications

## Stage 0 — Stabilize the existing baseline

**Goal:** make the current app incapable of silently losing a monthly recap while preparing a safe migration path.

**Deliverables:** fail-closed loading; per-resource durable save queue; bounded retry/backoff; request generations/abort handling; integer money representation; migration runner and health/deploy gate; encrypted off-host backup/restore; minimum responsive/a11y safety fixes only.

**Acceptance:** simulate initial-load failure then edit; no write occurs. Simulate rapid A→B month switching; both saves persist. Simulate `400`, offline, `401`, `409`; retries are bounded and state is visible. At 320 px no primary action/field is clipped. Schema mismatch fails preflight before the app is available. Backup restore verifies counts/checksums.

**Contract:** `docs/packtally/specs/00-foundation-and-cutover.md`.

## Stage 1 — Accounts, trips, roles, and audit history

**Goal:** replace the shared-password monthly recap with named passkey-first accounts and owner/contributor trips.

**Data:** accounts, passkeys, sessions/devices, trips, memberships, hashed invitations, audit_events, recovery_events. Deployment configuration—not database state—enables external features.

**Acceptance:** contributor cannot edit another contributor’s expense; owner cross-person correction requires reason and produces before/after event; invitation expires/revokes; active session revocation works; owner transfer is explicit and recoverable.

**Contract:** `docs/packtally/specs/01-identity-trips-and-audit.md`.

## Stage 2 — Expense ledger and mobile interaction model

**Goal:** build a normalized expense ledger and touch-first UI.

**Data:** expenses, expense_payers, expense_shares, expense_adjustments, receipt_links. Amounts are integer minor units plus ISO currency code.

**Acceptance:** equal/exact split preserves total and deterministically allocates remainder; refunds/fees are linked adjustments; mobile expense card supports create/edit/delete/receipt with no horizontal scroll; conflict UI requires a deliberate choice.

**Contract:** `docs/packtally/specs/02-expense-ledger-and-mobile-ui.md`.

## Stage 3 — Currency, settlement, and A4 PDF

**Goal:** calculate transparent travel estimates and final settlement.

**Data:** rate_snapshots, rate_overrides, settlement_runs, settlement_obligations, settlement_payments.

**Rules:** immutable expense-date rates; nearest-earlier fallback labelled estimated; IDR is canonical settlement; original-currency balances remain explanatory; actual statement reconciliation is preserved; payment counts only on recipient confirmation.

**Acceptance:** rate outage allows original-currency save with pending status; conversion snapshot never changes on refresh; generated transfer plan balances to zero; long A4 PDF has no clipped/orphaned headings and uses landscape only when needed.

**Contract:** `docs/packtally/specs/03-currency-settlement-and-pdf.md`.

## Stage 4 — Durable offline/PWA and notifications

**Goal:** make routine mobile interruption safe without a permanent Node server.

**Deliverables:** service-worker app-shell cache; IndexedDB encrypted/durable draft and operation queue; reconnect processor; in-app notifications; optional web push using VAPID; device/session control.

**Acceptance:** edit while offline, close/reopen browser, reconnect, and verify a single idempotent save. Simultaneous edit produces conflict, not last-write-wins. Push failure leaves in-app notification. Lock-screen push never exposes an amount.

**Contract:** `docs/packtally/specs/04-offline-pwa-and-notifications.md`.

## Stage 5 — Receipts, OCR, translation, and operations

**Goal:** deliver the highlighted receipt workflow with privacy-preserving fallbacks.

**Deliverables:** crop/redact/EXIF stripping/compression; non-public opaque storage; durable processing jobs; optional provider adapters for OCR/English translation/Indonesian secondary translation; receipt review and manual fallback.

**Acceptance:** OCR output never writes an expense without confirmation. Unsupported/oversized image is rejected clearly. Provider-down state allows upload/manual entry. Receipt authorization works for payer + owner only. Other member PDFs hide restricted receipt links/actions.

**Contract:** `docs/packtally/specs/05-receipts-ocr-and-translation.md`.

## Stage 6 — Launch simulation and hardening

**Goal:** prove the release is safe for the agreed target: ten members, 10,000 expenses, 1 GB RAM cPanel.

**Acceptance:** run structural simulation covering migrations, role boundaries, money/rates, offline/concurrent sync, passkey recovery, service-worker upgrade, PDF generation, receipt pipeline, external-service outage, backup restore, 320/430 px screens, and accessibility. At target scale, list p95 is under two seconds and PDF completes within five minutes/256 MB. Resolve every release-blocking issue before launch.

**Contract:** `docs/packtally/specs/06-operations-and-release.md`.
