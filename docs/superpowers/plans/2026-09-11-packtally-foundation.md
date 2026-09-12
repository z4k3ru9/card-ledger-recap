# PackTally Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the existing silent-loss/retry/migration blockers and establish a tested, deployable foundation for the later PackTally rewrite.

**Architecture:** Keep the existing static React plus PHP/MySQL shape temporarily, but make server state authoritative on load and make writes per resource durable, bounded, and conflict-aware. Add a forward-only migration ledger and deployment health check before any endpoint depends on a new schema feature. This plan intentionally does not add trips, receipts, or multi-currency; those are independent stages in `docs/packtally/STAGED-SPECS.md`.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 3, PHP 8+, MySQL/MariaDB, GitHub Actions.

**Spec:** `docs/packtally/PRD.md`, `docs/packtally/AUDIT.md`, and `docs/packtally/STAGED-SPECS.md`.

## Global Constraints

- Base production comparison is GitHub `main` at `69dd40c`; local `c3a13bc` is unpushed and must be reviewed, not blindly merged.
- Production Node must satisfy Vite 8: Node 20.19+ or Node 22.12+.
- Store no financial calculation as a JavaScript or PHP binary float; Stage 0 may normalize legacy whole-IDR amounts to integer `number` values only.
- A failed load must never make existing data look empty or trigger a write.
- Retry only bounded transient failures; `400`, `401`, and `409` require distinct visible recovery states.
- Schema changes are forward-only, idempotent, recorded, verified by health before deployment, and applied before compatible API/frontend release.
- Test changed UI at 320 px and 430 px widths. A simulation is mandatory for migration, money, auth, sync, and service-worker changes.

---

## File Structure

- `api/migrations/0001_migration_ledger.sql` — records applied migration IDs/checksums.
- `api/migrations/0002_recap_revision_and_rate_limits.sql` — extracts repair branch prerequisites into a tracked migration.
- `api/lib/migrations.php` — reads migration files, applies each in one transaction where supported, and verifies installed versions.
- `api/migrate.php` — CLI-only migration runner; refuses HTTP invocation.
- `api/health.php` — returns unhealthy JSON when required migration IDs are absent.
- `src/lib/recapSaveQueue.ts` — bounded, injectable retry policy and lifecycle-safe queue.
- `src/lib/recapSaveQueue.test.ts` — deterministic queue behavior tests with fake timers.
- `src/lib/money.ts` and `src/lib/money.test.ts` — legacy IDR integer parsing/summing/formatting helpers.
- `src/App.tsx` — fail-closed load state, request generation guard, global save/error status, responsive header composition.
- `src/components/SaveStatus.tsx` — accessible global state display.
- `src/components/BankCard.tsx`, `src/components/CashCard.tsx` — mobile card/reflow behavior and contextual action labels.
- `.github/workflows/quality.yml` — Node floor plus frontend/PHP quality checks.

### Task 1: Add versioned database migration support

**Files:**
- Create: `api/migrations/0001_migration_ledger.sql`
- Create: `api/migrations/0002_recap_revision_and_rate_limits.sql`
- Create: `api/lib/migrations.php`
- Create: `api/migrate.php`
- Modify: `api/health.php`
- Test: `tests/migrations_test.php`

**Interfaces:**
- Consumes: `api/lib/db.php` returning `PDO`.
- Produces: `pt_apply_migrations(PDO $pdo, string $directory): array{applied:list<string>,pending:list<string>}` and `pt_required_migrations_ok(PDO $pdo, array $required): bool`.

- [ ] **Step 1: Write the failing migration test**

```php
$pdo = new PDO('sqlite::memory:');
$result = pt_apply_migrations($pdo, __DIR__ . '/../api/migrations');
assert($result['applied'] === ['0001_migration_ledger', '0002_recap_revision_and_rate_limits']);
assert(pt_required_migrations_ok($pdo, ['0001_migration_ledger', '0002_recap_revision_and_rate_limits']));
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php tests/migrations_test.php`

Expected: FAIL because `pt_apply_migrations` is undefined.

- [ ] **Step 3: Implement the migration ledger and runner**

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  checksum CHAR(64) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

The runner must sort `NNNN_name.sql`, SHA-256 each file, reject an installed ID with a changed checksum, execute missing files, then insert its ID/checksum. The second migration creates `auth_rate_limits` and adds `recaps.revision` only when absent. `api/migrate.php` must check `PHP_SAPI === 'cli'` and exit non-zero otherwise.

- [ ] **Step 4: Make health verify migrations**

Return HTTP 503 with `{ "ok": false, "code": "schema_outdated", "missing": ["..."] }` when a required migration is not recorded; return `{ "ok": true }` only after database and migration checks pass.

- [ ] **Step 5: Run migration checks**

Run: `php tests/migrations_test.php && php -l api/migrate.php && php -l api/lib/migrations.php && php -l api/health.php`

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add api/migrations api/lib/migrations.php api/migrate.php api/health.php tests/migrations_test.php
git commit -m "feat: add verified database migrations"
```

### Task 2: Make recap loading fail closed and stale responses harmless

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/lib/api.ts`
- Create: `src/components/SaveStatus.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `fetchRecaps(): Promise<RecapCollection>` and `ApiError` from `src/lib/api.ts`.
- Produces: `LoadPhase = 'loading' | 'ready' | 'error'`; `SaveStatus` accepts `{ phase: 'saved' | 'saving' | 'offline' | 'attention' | 'error'; detail?: string }`.

- [ ] **Step 1: Write failing component tests**

```tsx
it('does not render an editable empty recap after load failure', async () => {
  vi.mocked(fetchRecaps).mockRejectedValue(new ApiError(503, 'unavailable'))
  render(<App />)
  expect(await screen.findByText(/could not load/i)).toBeVisible()
  expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument()
})

it('keeps the newest load when an older request resolves last', async () => {
  // Resolve request 2 before request 1 and assert only request 2 state is shown.
})
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because failed loading currently transitions to an editable empty recap and no request generation exists.

- [ ] **Step 3: Implement guarded loading**

Use an incrementing `loadGenerationRef`. Capture the generation before every request and ignore success/failure unless it equals the latest value. Keep `LoadPhase` as `error` on fetch failure, render Retry, and do not construct or start a save queue until a successful server collection exists. Abort a fetch on effect cleanup where the browser supports `AbortController`.

- [ ] **Step 4: Add persistent global save status**

Render `SaveStatus` in the app shell, not inside a month-specific header. Aggregate every pending/error/conflict queue state, prioritizing `attention`, then `error`, then `offline`, then `saving`, then `saved`. Give it `role="status"` and concise accessible text.

- [ ] **Step 5: Run focused checks**

Run: `npm test -- src/App.test.tsx && npm run lint && npm run build`

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/lib/api.ts src/components/SaveStatus.tsx src/App.test.tsx
git commit -m "fix: fail closed when recap loading fails"
```

### Task 3: Bound save retries and preserve error semantics

**Files:**
- Modify: `src/lib/recapSaveQueue.ts`
- Modify: `src/lib/recapSaveQueue.test.ts`
- Modify: `src/lib/api.ts`

**Interfaces:**
- Consumes: `saveRecap(month, recap, expectedRevision): Promise<SaveResult>`.
- Produces: queue state `{ kind: 'idle' | 'saving' | 'offline' | 'conflict' | 'error'; attempt: number; retryAt?: number }` and `retryNow(): void`.

- [ ] **Step 1: Write failing queue tests**

```ts
it('does not retry a 400 response', async () => {
  save.mockRejectedValue(new ApiError(400, 'invalid recap'))
  queue.schedule('2026-09', recap, 1)
  await vi.runAllTimersAsync()
  expect(save).toHaveBeenCalledTimes(1)
  expect(queue.state.kind).toBe('error')
})

it('backs off transient failures and stops after three attempts', async () => {
  save.mockRejectedValue(new TypeError('network'))
  queue.schedule('2026-09', recap, 1)
  await vi.advanceTimersByTimeAsync(1_000 + 2_000 + 4_000)
  expect(save).toHaveBeenCalledTimes(3)
  expect(queue.state.kind).toBe('offline')
})
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npm test -- src/lib/recapSaveQueue.test.ts`

Expected: FAIL because generic errors retry immediately without a cap.

- [ ] **Step 3: Implement retry classification**

Treat `400` as `error`, `401` as authentication-required, `409` as `conflict`, and only transport/`5xx` as retryable. Use delays of 1 s, 2 s, and 4 s; stop after attempt 3 until `retryNow()` or a browser `online` event. Dispose must suppress all callbacks after disposal and must not overwrite newer queue state.

- [ ] **Step 4: Add the required sync simulation**

Create a test sequence that schedules edit A, goes offline, schedules edit B, fires old completion, then reconnects. Assert B remains the only queued snapshot and exactly one idempotent save is sent after reconnect. Record this execution in the pull request.

- [ ] **Step 5: Run checks**

Run: `npm test -- src/lib/recapSaveQueue.test.ts && npm run lint`

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/recapSaveQueue.ts src/lib/recapSaveQueue.test.ts src/lib/api.ts
git commit -m "fix: bound recap save retries"
```

### Task 4: Replace unsafe amount helpers and repair narrow-screen interaction

**Files:**
- Create: `src/lib/money.ts`
- Create: `src/lib/money.test.ts`
- Modify: `src/components/AmountInput.tsx`
- Modify: `src/lib/format.ts`
- Modify: `src/components/BankCard.tsx`
- Modify: `src/components/CashCard.tsx`
- Modify: `src/App.tsx`
- Modify: `package.json`
- Test: `src/components/BankCard.test.tsx`

**Interfaces:**
- Produces: `parseIdr(input: string): number | null`, `sumIdr(values: readonly number[]): number`, and `formatIdr(amount: number): string`.
- `parseIdr` accepts only whole non-negative IDR values within `Number.MAX_SAFE_INTEGER`; invalid input returns `null`.

- [ ] **Step 1: Write failing money and mobile tests**

Install `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom` as development dependencies and configure Vitest’s component-test environment before writing the component test.

```ts
it('sums whole IDR exactly', () => {
  expect(sumIdr([100_000, 20_000, 1])).toBe(120_001)
})

it('rejects values outside safe integer range', () => {
  expect(parseIdr('9007199254740992')).toBeNull()
})
```

```tsx
it('names the delete action with its expense description', () => {
  render(<BankCard bank={{
    id: 'b-1', bankName: 'Travel card', colorIndex: 0, transactions: [{
      id: 't-1', date: '2026-09-11', description: 'Airport taxi', amount: 120_000,
    }],
  }} onChange={vi.fn()} onRemove={vi.fn()} />)
  expect(screen.getByRole('button', { name: /remove airport taxi/i })).toBeVisible()
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/lib/money.test.ts src/components/BankCard.test.tsx`

Expected: FAIL because input uses unrestricted `Number`, sums use native arithmetic directly, and delete names are generic.

- [ ] **Step 3: Implement integer-only legacy helpers and contextual controls**

Reject invalid values before queueing a save, format only validated integers, and give delete controls labels such as `Remove Airport taxi expense`. Add `aria-sort` to sortable date headers and explicit labels to bank selection/custom bank inputs.

- [ ] **Step 4: Apply minimum narrow-screen safety fixes**

Keep the legacy table for Stage 0 but give it an explicit labelled horizontal-scroll region and a visible narrow-screen hint so no field is clipped without a reachable scroll path. Make the header action group wrap, keep save status visible, and ensure Share’s icon-only variant has `aria-label="Share recap"`. Do not build the final Expense card; Stage 2 replaces this legacy surface.

- [ ] **Step 5: Run responsive/a11y evidence checks**

Run: `npm test -- src/lib/money.test.ts src/components/BankCard.test.tsx && npm run build`

Expected: all pass. Capture 320 px and 430 px screenshots showing every primary input/action reachable.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/money.ts src/lib/money.test.ts src/lib/format.ts src/components/AmountInput.tsx src/components/BankCard.tsx src/components/CashCard.tsx src/App.tsx src/components/BankCard.test.tsx
git commit -m "fix: make legacy recap entry safely reachable"
```

### Task 5: Add encrypted off-host backup and restore simulation

**Files:**
- Create: `api/cli/backup.php`
- Create: `api/lib/backup.php`
- Create: `tests/backup_test.php`
- Modify: `api/config.sample.php`
- Modify: `docs/packtally/DEPLOYMENT-CHECKLIST.md`

**Interfaces:**
- Produces: CLI commands `backup create`, `backup verify <artifact>`, and `backup restore-simulate <artifact> <isolated-database>`.
- Consumes: database DSN, private artifact roots, off-host adapter configuration, and an encryption key source outside cPanel/backup storage.

- [ ] **Step 1: Write a failing backup round-trip test**

Create a disposable database fixture with two recaps and assert create → decrypt → isolated restore reproduces row count plus SHA-256 checksums. Assert the artifact does not contain either recap description in plaintext.

- [ ] **Step 2: Run the test to verify failure**

Run: `php tests/backup_test.php`

Expected: FAIL because the backup module does not exist.

- [ ] **Step 3: Implement authenticated encrypted artifacts**

Stream a database dump through authenticated encryption without loading it entirely in memory. Write manifest fields `format_version`, `created_at`, `database_checksum`, `row_counts`, and `cipher`; keep credentials/key material out of the manifest and logs. Copy through a configured off-host adapter and enforce seven daily/four weekly retention.

- [ ] **Step 4: Implement isolated restore simulation**

Require an explicitly named non-production database DSN, decrypt/restore there, calculate counts/checksums, and exit non-zero on any mismatch. Refuse a DSN equal to the production DSN.

- [ ] **Step 5: Run backup checks**

Run: `php tests/backup_test.php && php -l api/cli/backup.php && php -l api/lib/backup.php`

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add api/cli/backup.php api/lib/backup.php api/config.sample.php tests/backup_test.php docs/packtally/DEPLOYMENT-CHECKLIST.md
git commit -m "feat: add verified encrypted backups"
```

### Task 6: Enforce runtime and deployment quality gates

**Files:**
- Modify: `.github/workflows/quality.yml`
- Modify: `README.md`
- Create: `docs/packtally/DEPLOYMENT-CHECKLIST.md`

**Interfaces:**
- Consumes: `api/migrate.php`, `api/health.php`, npm scripts, PHP test scripts.
- Produces: deployment checklist with ordered preflight/migration/health/rollback checks.

- [ ] **Step 1: Write the failing CI expectation**

Add workflow assertions that use Node `22.x`, run `npm ci`, `npm run lint`, `npm test`, `npm run build`, PHP lint/tests, and Composer validation/audit. Add a migration-test job before build artifacts are eligible for deployment.

- [ ] **Step 2: Run local quality commands**

Run: `npm ci && npm run lint && npm test && npm run build && php tests/migrations_test.php && php tests/recap_validation.php`

Expected: all pass with Node 22.x.

- [ ] **Step 3: Document cPanel release procedure**

The checklist order is: back up database; upload API code without exposing the new frontend; run `php api/migrate.php`; call `api/health.php` and require `ok: true`; upload static build; smoke-test passkey/login/load/save; retain prior static build for rollback. A failed health check stops release and restores the prior static build without reversing an already-applied forward migration.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/quality.yml README.md docs/packtally/DEPLOYMENT-CHECKLIST.md
git commit -m "ci: gate releases on migration health"
```

## Self-Review

- **Spec coverage:** Task 1 covers migration/deployment safety; Task 2 load-loss/stale response/global save state; Task 3 retry/offline/conflict behavior; Task 4 money/minimum mobile accessibility; Task 5 backup/restore; Task 6 Node/CI/cPanel release. The final mobile card model, multi-user, currency, receipt, PWA, and complete operations requirements are assigned to later stage contracts.
- **Placeholder scan:** no deferred implementation placeholders are used; every task has exact paths, a concrete behavior, a test command, and a commit boundary.
- **Type consistency:** queue state names and money helper signatures are defined in the task that creates them and used consistently in later tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-11-packtally-foundation.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task and review between tasks.
2. **Inline Execution** — execute tasks in this session, in batches with review checkpoints.

Choose one only after reviewing the PRD, audit, and staged specifications.
