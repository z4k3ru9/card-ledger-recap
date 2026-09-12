# PackTally Documentation Index

## Read first

1. [`../../CLAUDE.md`](../../CLAUDE.md) — agent working agreement.
2. [`../../CONTEXT.md`](../../CONTEXT.md) — canonical domain vocabulary.
3. [`../../DESIGN.md`](../../DESIGN.md) — governing visual and interaction contract.
4. [`PRD.md`](PRD.md) — confirmed product requirements.
5. [`UX-USER-FLOWS.md`](UX-USER-FLOWS.md) — screen-level journeys and state behavior.
6. [`AUDIT.md`](AUDIT.md) — verified GitHub-main and local-repair risks.
7. [`STAGED-SPECS.md`](STAGED-SPECS.md) — dependency and release order.
8. [`specs/SHARED-CONTRACTS.md`](specs/SHARED-CONTRACTS.md) — cross-stage data, error, idempotency, authorization, and performance rules.
9. [`openapi.yaml`](openapi.yaml) — machine-readable prelaunch route and schema contract.
10. The relevant stage contract under [`specs/`](specs/).
11. [`CLAUDE-HANDOFF.md`](CLAUDE-HANDOFF.md) and [`ISSUE-CATALOG.md`](ISSUE-CATALOG.md) before starting an implementation issue.

## Operational guides

- [`../architecture.md`](../architecture.md)
- [`../api-contract.md`](../api-contract.md)
- [`../security.md`](../security.md)
- [`../feature-flags.md`](../feature-flags.md)
- [`../deployment-cpanel.md`](../deployment-cpanel.md)
- [`../backup-restore.md`](../backup-restore.md)
- [`../recovery-runbook.md`](../recovery-runbook.md)
- [`../testing-release-gates.md`](../testing-release-gates.md)
- [`../adr/`](../adr/)

## Stage contracts

- [`00-foundation-and-cutover.md`](specs/00-foundation-and-cutover.md)
- [`01-identity-trips-and-audit.md`](specs/01-identity-trips-and-audit.md)
- [`02-expense-ledger-and-mobile-ui.md`](specs/02-expense-ledger-and-mobile-ui.md)
- [`03-currency-settlement-and-pdf.md`](specs/03-currency-settlement-and-pdf.md)
- [`04-offline-pwa-and-notifications.md`](specs/04-offline-pwa-and-notifications.md)
- [`05-receipts-ocr-and-translation.md`](specs/05-receipts-ocr-and-translation.md)
- [`06-operations-and-release.md`](specs/06-operations-and-release.md)

## Implementation rule

One issue or tightly coupled prerequisite group per pull request. Structural work must include the applicable simulation evidence under `docs/evidence/<release>/`. The first executable plan is [`../superpowers/plans/2026-09-11-packtally-foundation.md`](../superpowers/plans/2026-09-11-packtally-foundation.md).
