# Stage 3 Contract: Currency, Settlement, and PDF

## Objective and dependencies

Add immutable conversion evidence, canonical IDR settlement, confirmed repayments, and A4 reports. Requires Stage 2 Expenses, Allocations, Money, and audit.

## Persistence

- `rate_snapshots(id, base_currency, quote_currency='IDR', effective_date, numerator decimal(30,0), denominator decimal(30,0), provider_code, retrieved_at, estimate_kind exact_date|nearest_prior|manual, created_by)`.
- `expense_conversions(expense_id, rate_snapshot_id, estimated_idr_minor decimal(30,0), reconciled_idr_minor decimal(30,0) null, reconciled_by, reconciled_at, reason, revision)`.
- `settlement_runs(id, trip_id, ledger_revision, status calculated|superseded|closed, algorithm_version, created_by, created_at)`.
- `settlement_balances(run_id, member_id, idr_minor decimal(30,0))` and `settlement_obligations(id, run_id, debtor_id, creditor_id, idr_minor decimal(30,0), stable_order)`.
- `repayments(id, trip_id, payer_id, recipient_id, original_minor decimal(30,0), currency, rate_snapshot_id, idr_minor decimal(30,0), state proposed|confirmed|reversed, revision, proposed_at, confirmed_at)`.
- `report_jobs(id, trip_id, requested_by, ledger_revision, state queued|running|complete|failed|expired, progress tinyint, private_path, error_code, expires_at)`.

## Modules and interfaces

- **Rate module:** `quote(currency, expenseDate)`, `recordManualRate`, `reconcileStatement`; adapters satisfy one provider interface and results are cached.
- **Settlement module:** `calculate(ledgerSnapshot): SettlementResult`; pure and deterministic, returning IDR balances and minimized obligations.
- **Repayment module:** `propose`, `confirm`, `reverse`; a repayment affects balance only after confirmation.
- **Report module:** `request`, `status`, `download`; generation runs as a durable capped background job.

## Rules

Expense conversion uses its local expense date and exact or nearest-prior rate; missing rate marks `rate_pending` without blocking original-currency save. Provider values are immutable integer ratios. Conversion rounds once to IDR half-up unless a Statement Reconciliation records the actual IDR value. A non-IDR Repayment uses payment-date rate and locks on recipient confirmation; actual statement IDR may replace it through a recorded reconciliation. Settlement balances must sum exactly to zero IDR.

## PDF contract

The private whole-trip PDF includes original amounts, rates/provenance, estimate/reconciliation status, per-member IDR balances, obligations, repayment status, exporter, generation time, and audit summary. It omits unauthorized receipt links/actions. Use A4 portrait by default and landscape for wide settlement/audit tables, with repeated headings and no orphaned sections. Generated files expire after 24 hours.

## Endpoints

`GET/POST /api/rates`, `POST /api/expenses/{id}/rate-override`, `POST /api/expenses/{id}/reconcile`, `POST /api/trips/{id}/settlements`, `GET /api/settlements/{id}`, `POST /api/repayments`, `POST /api/repayments/{id}/confirm`, `POST /api/repayments/{id}/reverse`, `POST /api/trips/{id}/reports`, `GET /api/reports/{id}`, and authenticated `GET /api/reports/{id}/download`.

## Mandatory simulations

Nearest-prior and pending rates label correctly. Provider refresh cannot alter a snapshot. Reconciliation preserves estimate and changes future Settlement Runs. Settlement is deterministic regardless of input ordering and sums to zero. Confirmation/reversal affects balances once. A 10,000-Expense PDF completes within five minutes and 256 MB, paginates correctly, and cannot be downloaded after expiry or by a non-member.

## Acceptance

Every IDR value can be traced to original Money and a Rate Snapshot or reconciliation. No report or settlement claims completeness while any included Expense is `rate_pending`.
