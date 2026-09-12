# Thermo-Nuclear Foundation Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the release-blocking correctness and maintainability defects from the legacy recap baseline before extending it into PackTally.

**Architecture:** Keep the existing legacy recap surface isolated while hardening its persistence boundary. Introduce typed integer money values, a classified bounded save state machine, cancellable load generations, and explicit API mutation identity. Do not add PackTally domain features to the legacy monthly JSON schema.

**Tech Stack:** React 19, TypeScript, Vitest, PHP 8+, PDO/MySQL, Vite.

**Spec:** `docs/packtally/STAGED-SPECS.md`, `docs/packtally/specs/00-foundation-and-cutover.md`, `docs/packtally/specs/SHARED-CONTRACTS.md`.

## Global Constraints

- Money uses integer minor units or decimal strings; never binary floating point.
- Mutations are idempotent and revision-aware.
- Retryable failures are bounded and visible; validation/auth/conflict failures are not retried automatically.
- Legacy recap data remains read-only during the PackTally cutover.
- Every change must pass `npm test`, `npm run lint`, `npm run build`, and `npm run test:php`.

### Task 1: Harden the save queue

**Files:** `src/lib/recapSaveQueue.ts`, `src/lib/recapSaveQueue.test.ts`.

- [x] Add explicit retry classification, exponential backoff with a cap, and a manual retry callback.
- [x] Ensure 400/401/409 stop automatic retries and retain visible state.
- [x] Ensure `dispose()` invalidates in-flight completions.
- [x] Add tests for bounded retry, permanent failure, disposal, and recovery.

### Task 2: Make loads generation-safe

**Files:** `src/App.tsx`, new `src/lib/requestGeneration.ts`, tests for the generation helper.

- [x] Use an `AbortController` per recap load.
- [x] Ignore all stale completions after a newer load begins or the component unmounts.
- [x] Cancel the previous queue before installing a new one.
- [x] Add a simulation proving an older response cannot replace newer server state.

### Task 3: Replace floating money in the legacy path

**Files:** `src/lib/types.ts`, `src/lib/rows.ts`, `src/components/AmountInput.tsx`, `src/lib/format.ts`, `src/lib/pdf.ts`, `api/lib/recap.php`, `tests/recap_validation.php`, and focused TypeScript tests.

- [x] Represent persisted amounts as validated non-negative integer minor units.
- [x] Keep display formatting separate from storage representation.
- [x] Reject floats, exponent notation, negative values, and unsafe integer overflow at the API boundary.
- [x] Preserve a deterministic compatibility conversion for existing integer JSON data.
- [x] Add precision and overflow tests.

### Task 4: Add mutation idempotency and stable API envelopes

**Files:** `api/schema.sql`, `api/lib/http.php`, `api/recaps.php`, `src/lib/api.ts`, migration/health docs, and PHP tests.

- [x] Accept and validate `Idempotency-Key` and `client_operation_id`.
- [x] Persist request hash, response status, and response body for replay.
- [x] Return the recorded response for identical replays and a conflict for mismatched replays.
- [x] Keep revision conflicts explicit and non-retryable.
- [x] Add schema readiness checks and test repeated requests.

### Task 5: Close authentication and contract leaks

**Files:** WebAuthn verify endpoints, rate limiter, `src/lib/api.ts`, OpenAPI/route inventory, and security tests/docs.

- [x] Replace raw WebAuthn exception messages with request-ID-backed generic errors.
- [x] Apply bounded passkey verification rate limits.
- [x] Define trusted proxy behavior instead of blindly trusting forwarded headers.
- [x] Add a CI check that documented PackTally routes are clearly marked implemented or design-only.

### Task 6: Add release simulations and cutover guardrails

**Files:** `docs/packtally/AUDIT.md`, `docs/testing-release-gates.md`, new simulation tests/docs.

- [x] Cover initial-load failure, rapid month switching, stale responses, retry classification, money precision, and idempotent replay.
- [x] Document that current legacy routes cannot satisfy the PackTally OpenAPI contract.
- [ ] Keep the legacy JSON model read-only once the normalized PackTally schema is introduced.
