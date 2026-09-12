# Stage 0 Contract: Foundation and Legacy Cutover

## Objective and dependencies

Prevent silent loss in the existing recap application and establish deployment, migration, backup, and evidence gates. This stage depends only on the current repository and `SHARED-CONTRACTS.md`; it does not introduce PackTally accounts or trips.

## Modules and interfaces

- **Migration module:** `applyPending(): MigrationResult`, `verifyRequired(ids): VerificationResult`. It owns ordering, checksums, transactions, and the migration ledger.
- **Legacy save module:** `schedule(month, snapshot, revision)`, `retry(month)`, `dispose()`, and one observable aggregate save state. It owns debounce, serialization, bounded backoff, cancellation, and stale-completion suppression.
- **Health module:** `check(): HealthReport`. It owns database/schema/runtime/config/provider checks and exposes no secret values.
- **Backup module:** CLI-only `create`, `verify`, and `restore-simulate` commands. It owns encryption, off-host copy, retention, and evidence.

## Persistence

`schema_migrations(id varchar(128) PK, checksum char(64), applied_at datetime(6))` and `idempotency_records(id char(36), account_scope varchar(64), route varchar(160), request_hash char(64), response_status smallint, response_json longtext, created_at datetime(6), expires_at datetime(6))`. Existing `recaps` remain unchanged except tracked revision prerequisites.

## Required behavior

- Initial load has `loading|ready|error`; only `ready` may create a save module.
- Each request has a generation; old responses/callbacks are discarded.
- Generic transient retries wait 1, 2, then 4 seconds and stop. Validation/auth/conflict never auto-retry.
- Stage 0 mobile work is limited to preventing clipping, naming controls, and making critical actions reachable at 320/430 px. The final expense-card redesign belongs to Stage 2.
- Before any release: encrypted off-host backup, migration application, health success, then static frontend activation.

## Legacy cutover procedure

During Stage 1 activation, enter maintenance mode, reject legacy writes, create/verify a final backup, copy each `recaps` row byte-for-byte into `legacy_recaps(month, data_json, original_revision, original_updated_at, imported_at, checksum)`, compare counts/checksums, then enable PackTally. Legacy Recaps remain read-only and use legacy PDF semantics. No dual writes and no inferred participant assignment are permitted.

## Failure contracts

Schema checksum mismatch and missing required migration return `schema_outdated`; the release stops. Load failure renders retry/read-only error. Save validation renders field error. Exhausted transient retry renders offline/error with manual retry. Conflict displays comparison and never overwrites.

## Endpoints

After cutover, `GET /api/legacy-recaps`, `GET /api/legacy-recaps/{month}`, and authenticated `GET /api/legacy-recaps/{month}/pdf` expose byte-identical read-only data and legacy rendering. No mutation endpoint exists.

## Mandatory simulations

Failed initial GET followed by attempted edit produces zero writes. Month A edit followed by immediate month B navigation persists A and B. Old GET/write completion cannot replace a newer generation. `400`, `401`, `409`, offline, `429`, and `500` follow their distinct retry rules. Backup restore reproduces recap count and checksums. Migration rerun is a no-op.

## Acceptance

All release blockers PT-001 through PT-008 are closed with evidence. Health is false before and true after migrations. The legacy UI has no clipped primary field/action at 320 or 430 px, but receives no throwaway full redesign.
