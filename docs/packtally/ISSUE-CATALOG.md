# PackTally Issue Catalog for Claude

Use this catalog to select one independently reviewable unit of work. Do not start an issue whose prerequisite stage is incomplete.

| ID | Priority | Issue | Stage | Done when |
| --- | --- | --- | --- | --- |
| PT-001 | P0 | Initial-load failure can overwrite server recap | 0 | Failed GET keeps app read-only/error; no POST occurs until a successful load. |
| PT-002 | P0 | Fast month switch cancels unsaved edit | 0 | A→B within debounce persists both revisions. |
| PT-003 | P0 | Code/schema deployment can break APIs | 0 | Tracked migrations run and health rejects incompatible release. |
| PT-004 | P1 | Generic save retry loops forever | 0 | 400/401/409 stop with recovery state; retryable errors back off and cap. |
| PT-005 | P1 | Old request/write can replace newer state | 0 | Generation/abort/idempotency simulation proves stale completion cannot win. |
| PT-006 | P1 | Binary floats are used for money | 0 | Legacy amount path uses validated integer minor units only. |
| PT-007 | P1 | Mobile tables/header hide controls | 0 | 320/430 px card interaction has no horizontal primary workflow. |
| PT-008 | P1 | Accessibility labels and overlapping controls | 0 | Accessible names, contextual delete labels, sort state, and non-overlap tests pass. |
| PT-009 | P0 | Shared login cannot enforce participant rights | 1 | Account/trip/member authorization is server-enforced and tested. |
| PT-010 | P1 | No append-only financial history | 1 | Owner edits, membership, recovery, closure, and ownership transfer emit immutable events. |
| PT-011 | P1 | Current monthly JSON blob cannot support PackTally | 1–2 | Normalized trip/expense schema replaces it through a forward migration. |
| PT-012 | P1 | No normalized split, refund, or fee logic | 2 | Equal/exact splits, deterministic remainder, and linked adjustments preserve balance. |
| PT-013 | P1 | No multi-currency truth model | 3 | Original currency, source rate snapshot, estimate label, override, and IDR report are preserved. |
| PT-014 | P1 | No accountable settlement workflow | 3 | Deterministic plan, proposed/confirmed payments, and reversals reconcile balances. |
| PT-015 | P1 | Browser interruption loses drafts | 4 | Offline close/reopen/reconnect simulation persists exactly one idempotent operation. |
| PT-016 | P2 | Existing PDF can clip/orphan headings | 3 | Long A4 portrait/landscape reports paginate correctly with exporter/privacy metadata. |
| PT-017 | P1 | Receipt storage would expose sensitive files | 5 | Opaque private storage, authorization, redaction, metadata stripping, and limits are enforced. |
| PT-018 | P2 | OCR/translation could create false expenses | 5 | Suggestions require review; provider failure retains manual path. |
| PT-019 | P2 | Notifications are missing/unreliable | 4–5 | Persisted in-app alerts survive push failure; lock-screen copy excludes values. |
| PT-020 | P1 | Backup/recovery and provider failure invisible | 5–6 | Health summary, verified restore, provider fallback, and release simulation are documented and tested. |
| PT-021 | P0 | Legacy JSON has no truthful participant migration | 0–1 | Maintenance cutover preserves byte-identical, checksum-verified, read-only Legacy Recaps without dual write. |
| PT-022 | P1 | Offline encryption lacks key/account lifecycle | 4 | Account-scoped device key, offline unlock, sign-out warning/purge, revocation, and store upgrades pass simulation. |
| PT-023 | P1 | API mutations can drift or replay | 1–5 | Released OpenAPI contract, standard envelopes, revisions, and idempotency apply to every mutation. |
| PT-024 | P1 | External features could activate through mutable state | 1–6 | Deployment configuration is authoritative and `/api/capabilities` is read-only/safe. |
| PT-025 | P1 | Background work could exhaust cPanel requests/RAM | 3–6 | Durable leased jobs, bounded retry, 256 MB cap, progress, and manual recovery pass target simulation. |

## Mandatory issue template

Every implementation issue must include: linked PRD and stage-contract sections, prerequisite IDs, exact OpenAPI/data impact, migration impact, feature-flag behavior, failed-test or simulation first, mobile/accessibility impact, external-service fallback, rollback/recovery note, and acceptance evidence. For PT-001 through PT-007, PT-009 through PT-015, and PT-021 through PT-025, a simulation result is mandatory.
