# PackTally — Claude Working Agreement

## Read before editing

1. `CONTEXT.md`
2. `docs/packtally/README.md`
3. `docs/packtally/PRD.md`
4. `docs/packtally/specs/SHARED-CONTRACTS.md`
5. The current stage contract in `docs/packtally/specs/`
6. `docs/packtally/openapi.yaml`
7. `docs/packtally/AUDIT.md`

## Project truth

This repository currently implements a shared-login monthly card recap. It is not PackTally’s target model. PackTally is a deliberate rewrite to normalized, passkey-first shared travel Trips; do not layer new Trip features on `recaps.data`.

The public baseline is GitHub `main` at `69dd40c`. Local `codex/repair-audit-findings` at `c3a13bc` is unpushed; it contains useful defensive ideas but must not be merged wholesale.

## Non-negotiables

- Use integer/decimal arithmetic for Money and rates; never JS/PHP binary floats.
- Require server authorization, expected revisions, and idempotency for every mutation.
- Never silently resolve conflicting financial edits or failed loads/saves.
- Preserve original currency, conversion snapshot, reconciliation, and audit history.
- Keep raw pre-redaction receipt bytes off the server; receipt storage is private and payer/Owner-only.
- Deployment configuration, not database rows or client controls, enables external providers.
- HTTPS, forward-only idempotent migrations, health checks, off-host encrypted backups, and evidence are release gates.
- Do not make a permanent Node process necessary on cPanel.

## Work protocol

One issue-catalog item or tightly coupled prerequisite group per pull request. Start with a failing test or required simulation, implement the smallest complete change, run focused and project checks, add evidence under `docs/evidence/<release>/` when structural, and commit only the reviewed unit.

Do not introduce a new route, database table, response shape, capability, or domain term without updating the relevant stage contract, `openapi.yaml`, and `CONTEXT.md` when vocabulary changes.

## Commands currently available

`npm run lint`, `npm test`, `npm run build`, `npm run test:php`, and `composer validate` from `api/`. Use Node 22.x in CI; Vite 8 requires Node 20.19+ or 22.12+.
