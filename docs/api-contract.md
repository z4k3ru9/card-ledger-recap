# PackTally API Contract Guide

`docs/packtally/openapi.yaml` is the machine-readable prelaunch contract. `docs/packtally/specs/SHARED-CONTRACTS.md` defines shared behavior and stage contracts define persistence/domain rules.

## Rules for changing the contract

Before first production release, reshape `/api` freely but update OpenAPI, stage spec, frontend client types, tests, and evidence together. After release, breaking changes to a route, request, response, auth, or queued-operation meaning require an explicit compatibility/version path.

All mutations carry the same UUIDv7 in `Idempotency-Key` and `client_operation_id`; revisioned entities also carry `expected_revision`. Every success/error uses the standard envelope and request ID. Collections are cursor-paginated at 50.

## Client generation

Generate or validate TypeScript request/response types from OpenAPI where practical. PHP validation remains authoritative and must enforce the same domain invariants. Do not trust generated client types as authorization or financial validation.

## Contract review checklist

Confirm route ownership, auth/role, feature flag, idempotency, revision behavior, error codes/retryability, cursor behavior, response redaction, audit event, notification, offline behavior, and migration impact before merging a contract change.
