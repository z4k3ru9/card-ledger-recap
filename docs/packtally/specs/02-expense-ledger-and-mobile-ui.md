# Stage 2 Contract: Expense Ledger and Mobile Interaction

## Objective and dependencies

Provide normalized, revisioned Expenses and allocations behind a touch-first interface. Requires Stage 1 identity, Trips, authorization, and audit.

## Persistence

- `expenses(id, trip_id, payer_member_id, expense_date, expense_timezone, merchant, description, amount_minor decimal(30,0), currency char(3), status draft|recorded|voided, revision, created_by, created_at, updated_at)`.
- `expense_shares(id, expense_id, member_id, method equal|exact|percentage|weight, input_value decimal(30,9), allocated_minor decimal(30,0), stable_order smallint)`.
- `expense_adjustments(id, expense_id, kind refund|fee|fx_fee|tip|discount|correction, amount_minor decimal(30,0), currency char(3), reason, revision, created_by, created_at)`.
- `entity_tombstones(entity_type, entity_id, trip_id, final_revision, deleted_by, deleted_at)` for synchronization.

## Modules and interfaces

- **Money module:** `parse`, `add`, `subtract`, `convert`, `format`; values are integer strings/decimal objects, never floats.
- **Allocation module:** `allocate(expenseMoney, beneficiaries, method): AllocationResult`. Result must sum exactly to the Expense.
- **Expense module:** `record(command)`, `revise(command, expectedRevision)`, `void(command, expectedRevision)`, `list(query)`.
- **Mobile expense module:** one form interface for payer, beneficiaries, date/timezone, currency/amount, allocation, description, and receipt handoff.

## Allocation rules

Equal split divides integer minor units and assigns remainder units by immutable `stable_order`. Exact amounts must sum to the Expense. Percentage inputs must total exactly 100 decimal percent before conversion; remainder uses stable order. Weights are positive decimal strings and are normalized before deterministic remainder allocation. Refunds and other adjustments remain linked records; they never rewrite the original amount.

## Authorization and conflicts

Contributor creates/edits/voids own Expense. Owner may alter another member’s Expense only with a reason. Updates require `expected_revision`; same-Expense conflict returns server value and conflicting fields. Different Expense IDs never conflict solely because the Trip changed.

## Endpoints

`GET/POST /api/trips/{tripId}/expenses`, `GET/PATCH/DELETE /api/expenses/{id}`, and `POST /api/expenses/{id}/adjustments`. Lists use date-descending cursor pagination of at most 50.

## Mobile behavior

At 320–430 px, an Expense is a vertical card and edit is a full-height sheet. **Add expense** is always reachable. Payer, original amount/currency, estimated IDR status, split summary, receipt status, and save state do not require horizontal scrolling. Desktop may use a table. Critical errors and conflicts use sheets; success uses brief toast; totals appear once in a sticky summary.

## Mandatory simulations

Every split method preserves exact minor units for awkward totals; JPY, IDR, USD, and KWD exponent rules pass. Owner correction emits audit/notification. Contributor cross-person mutation fails. Two same-revision edits conflict; edits to two Expenses both succeed. A deleted Expense tombstone prevents offline resurrection. Automated accessibility names and 320/430 px screenshots accompany structural UI changes.

## Acceptance

Ten members and 10,000 Expenses remain navigable through pagination. No stored/calculated value uses binary floating point. Every card action identifies its target, and the mobile primary workflow has no horizontal dependency.
