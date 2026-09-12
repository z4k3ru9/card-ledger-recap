# PackTally Audit — 2026-09-12

## Current cutover status

The PackTally OpenAPI file is a prelaunch design contract, not a claim that those routes are live. The current deployable API is the legacy PHP surface (`login.php`, `recaps.php`, WebAuthn endpoints, and health/status endpoints). Every PackTally contract route is currently marked `design-only` in [`route-inventory.json`](route-inventory.json). The contract check must pass before release so a newly added route cannot silently disappear from the implementation inventory.

The legacy recap model remains isolated and must not be treated as the normalized trip/expense model. A route may be changed to `implemented` only after its authenticated handler, persistence, authorization, idempotency behavior, and integration tests exist.

The cutover switch is `legacy_read_only` in `api/config.php`. It defaults to `false` for the existing deployment. Set it to `true` only after the final backup has been verified and every row has been copied and checksum-compared into `legacy_recaps`; then legacy POST writes fail with `legacy_read_only` while authenticated reads remain available.

## Scope and identity

The only repository evidence available was `z4k3ru9/card-ledger-recap`. The repository contains no `PackTally` or `CuanKoper` branding, so brand/repository naming is a release-management discrepancy. GitHub `main` is `69dd40c`; local branch `codex/repair-audit-findings` is one unpushed commit ahead (`c3a13bc`). Findings below distinguish the public baseline from that local repair work.

## Release blockers: GitHub main

1. **Failed initial load can overwrite real data.** `src/App.tsx` converts any `fetchRecaps()` failure into an empty loaded state, after which autosave can replace an existing month with blank/new data. Treat load failure as error/read-only and retry; never save an assumed-empty state.
2. **Fast month switching loses edits.** Main debounces the current month only. Changing month before its debounce fires cancels that month’s only pending save. Use a durable per-resource queue.
3. **Mobile entry is not mobile-first.** Bank/cash tables require horizontal scrolling; critical amount/delete controls disappear off-screen at 320–430 px. The header action row also overflows at narrow widths.
4. **Production migration coupling.** The repair code requires `recaps.revision` and `auth_rate_limits`; deploying code without schema changes causes runtime API failures. Current frontend does not surface the health signal.

## High risks still present in the local repair branch

1. **Unbounded retry loop.** `src/lib/recapSaveQueue.ts` retries generic errors immediately. Offline failure and server `400` validation failure can retry forever and be mislabeled offline. Add bounded exponential backoff, online-event retry, visible error, and manual retry.
2. **Stale request race.** Reload/retry has no request generation or abort mechanism; old fetches and in-flight writes can replace newer state after a conflict/discard action.
3. **Financial precision.** UI/PDF/API values use JS/PHP floating point. Store and calculate integer minor units or decimal strings; never use binary floats for money.
4. **Save-state scope.** Save status is tied to current month. Unresolved changes/conflicts become invisible after navigation.

## UX, accessibility, and product discrepancies

- Repeated subtotals in card badge, table footer, and summary create redundant mobile scroll.
- Share icon has no accessible name at small sizes; delete buttons lack row context; sortable date lacks `aria-sort`; bank controls lack explicit labels.
- Fixed toast and Back-to-top controls compete for the same bottom-right space.
- Clearing an automatic blank-row workflow can remove focus; there is no explicit add-row affordance.
- Custom bank names can duplicate; PDF headings can be clipped/orphaned on long reports.
- English interface, Indonesian PDF, hard-coded IDR, and legacy Card Ledger Recap branding conflict with PackTally’s international-travel purpose.

## Quality and operations gaps

- Only five small Vitest cases plus one PHP validation script. No component, integration, mobile viewport, accessibility, migration, WebAuthn E2E, multi-session race, PDF-pagination, receipt, backup restore, or PWA tests.
- Build succeeds but local Node 20.15.1 is below Vite 8’s stated 20.19+/22.12+ floor.
- Rate limiting relies on `REMOTE_ADDR`; proxy/NAT handling needs explicit deployment design. Passkey verification is not rate limited in the same way as password attempts.
- WebAuthn has strict origin/RP-ID coupling; domain/subdomain/port mistakes break passkeys.

## Required release order

1. Establish a versioned migration and deployment gate; fix current data-loss, retry, race, money, and mobile blockers.
2. Replace the shared-month recap model with account/trip/member/expense domain model and permission enforcement.
3. Add conversion snapshots, settlement, PDFs, durable offline queue, PWA, and audit trail.
4. Add receipt storage/OCR/translation, notifications, operational health, backups, and recovery.

Never merge or deploy `c3a13bc` as-is: it fixes two severe main-branch loss paths but has unresolved retry/race behavior and a schema dependency.
