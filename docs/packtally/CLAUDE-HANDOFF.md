# Claude Handoff: PackTally

Read these documents before editing:

1. `docs/packtally/PRD.md` — product contract.
2. `DESIGN.md` — governing visual and interaction contract.
3. `docs/packtally/UX-USER-FLOWS.md` — screen-level journeys and state behavior.
4. `docs/packtally/AUDIT.md` — verified baseline failures and branch warning.
5. `docs/packtally/STAGED-SPECS.md` — implementation order and acceptance criteria.
6. `docs/packtally/specs/SHARED-CONTRACTS.md` — identifiers, money, errors, idempotency, pagination, authorization, and capabilities.
7. The matching `docs/packtally/specs/0N-*.md` stage contract — exact persistence, module interfaces, behavior, failure modes, and simulations.
8. `CONTEXT.md` and `docs/adr/` — canonical domain language and hard-to-reverse decisions.
9. `docs/superpowers/plans/2026-09-11-packtally-foundation.md` — first executable task plan.

## Non-negotiable rules

- Do not treat the current shared-login/month-recap schema as a base for multi-user trips; migrate deliberately.
- Do not deploy a frontend/API that needs a schema column before an idempotent migration has been applied and verified.
- Do not use JavaScript or PHP binary floating point for stored/calculated money.
- Do not silently resolve a concurrent financial edit, conversion failure, failed load, or failed save.
- Do not expose receipts under public URLs or store a user filename/EXIF data as trusted metadata.
- Do not make OCR, translation, exchange rates, push, or a Node process necessary to save an expense.
- Do not remove the original receipt/currency/rate context when rendering an estimate or reconciliation.
- Do not use a horizontal table as the primary mobile expense editor.
- Do not expose restricted receipt links in another participant’s UI or PDF.
- Do not keep raw pre-redaction receipt bytes.
- Do not let database state enable an external provider; deployment configuration is authoritative.

## Repository starting point

- Public GitHub baseline: `main` at `69dd40c`.
- Local-only repair branch: `codex/repair-audit-findings` at `c3a13bc`; it is not on GitHub and must not be blindly merged.
- Frontend: React 19 + TypeScript + Vite 8 + Tailwind/shadcn under `src/`.
- Backend: framework-free PHP + MySQL under `api/`; current schema is a shared-login monthly JSON recap model, unsuitable for PackTally.

## Execution protocol

1. Work one stage at a time. Read `CONTEXT.md`, Shared Contracts, and that stage’s contract and dependencies.
2. Write the failing test/simulation before implementation. For a structural change, run the required simulation in addition to focused tests.
3. Keep migrations forward-only and idempotent. Add a migration record/table and an API health assertion.
4. Test desktop plus 320 px and 430 px touch layouts. Test an offline edit, reconnect, stale request, conflict, and browser reload whenever sync changes.
5. Commit each independently reviewable task. Do not combine a domain/schema migration with a visual redesign in the same commit.
6. Before first release `/api` may be reformed completely. After release, breaking clients/queued operations requires an explicit compatibility/version path.

## Required delivery evidence per pull request

- A short migration/deployment note and rollback/recovery statement.
- Tests executed and their output summary.
- Screenshot or recording at 320 px and 430 px if UI changed.
- A simulation result for schema/auth/money/sync/PWA changes.
- Explicit statement whether external-provider flags were enabled or disabled.
