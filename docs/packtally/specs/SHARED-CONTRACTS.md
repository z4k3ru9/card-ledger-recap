# PackTally Shared Contracts

## Contract authority

Before first production deployment, `/api` may be replaced freely. The first released OpenAPI 3.1 document becomes authoritative; afterward any breaking request, response, authentication, or offline-operation change requires an explicitly versioned compatibility path.

## Identifiers and representations

- Persistent identifiers are lowercase UUIDv7 strings.
- Database timestamps are UTC `DATETIME(6)`; JSON timestamps are RFC 3339 UTC strings.
- `expense_date` is an ISO `YYYY-MM-DD` calendar date accompanied by an IANA `expense_timezone`; it never shifts with the viewer’s timezone.
- Money is `{ "minor": "125000", "currency": "IDR" }`. `minor` is a base-10 integer string to avoid JSON/JavaScript precision loss. ISO 4217 exponent validation applies at input and output.
- Rates are `{ "numerator": "154321", "denominator": "10", "quote_currency": "IDR", "base_currency": "USD" }`; implementations use integer/decimal arithmetic, never binary floats.
- Mutable entities expose an integer `revision`, incremented exactly once per accepted mutation.

## Response envelope

Success:

```json
{"ok":true,"data":{},"request_id":"01993f36-7710-7000-8000-000000000001"}
```

Failure:

```json
{
  "ok":false,
  "error":{
    "code":"validation_failed",
    "message":"Check the highlighted fields.",
    "fields":{"amount.minor":"Must be an integer string."},
    "retryable":false,
    "retry_after_seconds":null,
    "details":{}
  },
  "request_id":"01993f36-7710-7000-8000-000000000001"
}
```

Allowed stable codes include `unauthenticated`, `forbidden`, `validation_failed`, `not_found`, `revision_conflict`, `idempotency_conflict`, `rate_pending`, `provider_unavailable`, `feature_disabled`, `too_many_requests`, `schema_outdated`, and `internal_error`. Error messages never contain secrets, SQL, receipt content, or provider credentials.

## Mutation contract

- Every mutation requires `Idempotency-Key: <UUIDv7>` and a JSON body containing `client_operation_id` with the same value.
- The server stores account ID, route, request hash, status, and response for at least 35 days. Reuse with the same hash returns the recorded response; reuse with another hash returns `idempotency_conflict`.
- Updating/deleting a mutable entity requires `expected_revision`.
- `revision_conflict` returns the current server entity/revision plus `conflicting_fields`; it never applies either version.
- `400`, `401`, `403`, `404`, `409`, and `422` are not automatically retried. Transport failures, `429`, and `5xx` are retried only when the envelope permits it and are capped with exponential backoff.

## Pagination and performance

- Collection default and maximum page size is 50; cursor pagination uses opaque signed cursors.
- Interactive collection requests target p95 under two seconds at ten members and 10,000 Expenses.
- Background PDF/OCR/translation jobs are durable and capped at 256 MB per process. PDF target completion is five minutes, with visible progress; private generated PDFs expire after 24 hours.

## Authorization

Authorization is checked server-side at a single seam before domain mutation. Adapters never infer permission from client-visible controls. Receipt bytes are visible only to payer and Owner. Other Trip Members may export the whole trip, but restricted receipt links and actions are omitted entirely.

## Feature capabilities

Deployment configuration alone enables password fallback, external OCR, translation, web push, and provider adapters. `GET /api/capabilities` exposes booleans and health states only; it never identifies credentials or allows mutation. External OCR/translation default off; PWA and in-app notifications default on; web push still requires browser permission.
