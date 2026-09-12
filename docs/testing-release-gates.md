# PackTally Testing and Release Gates

## Focused checks

Every change runs its focused unit/component/PHP tests plus lint/build. UI work includes 320 px and 430 px evidence. API changes validate against `docs/packtally/openapi.yaml` and standard error/idempotency behavior.

## Required structural simulations

Run when schema, permissions, money/rates, offline sync, authentication, or service-worker behavior changes:

- Fresh install and idempotent migration rerun.
- Legacy cutover count/checksum verification.
- Owner/contributor authorization denial and reason/audit behavior.
- Currency exponent, nearest-prior rate, reconciliation, and zero-IDR settlement.
- Offline close/reopen/reconnect, duplicate replay, same-Expense conflict, tombstone, and service-worker upgrade.
- Passkey onboarding, session revocation, and CLI-only recovery.
- 10 members/10,000 Expenses: list p95 under two seconds and private PDF within five minutes/256 MB.
- Receipt limits/authorization/metadata stripping and OCR/provider outage fallback.
- Off-host encrypted backup and isolated restore.

## Release gate

Block release for unresolved P0/P1 audit issues, unhealthy schema/config, missing backup restore evidence, failed applicable simulation, inaccessible mobile primary flow, financial precision defect, hidden save/error state, or unreviewed migration. Automated test expansion is optional for narrow changes, but simulations above are never optional when applicable.
