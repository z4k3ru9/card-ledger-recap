# Stage 6 Contract: Operations and Release

## Objective and dependencies

Prove recoverability, external-service degradation, and structural correctness on a 1 GB RAM cPanel deployment. Operational protection begins in Stage 0; this stage verifies the complete system.

## Deployment configuration

Required: database, canonical HTTPS origin, WebAuthn RP ID/origin, private receipt/report storage roots, rotating recovery secret source, migration requirements, backup destination/key source, cron lock configuration. Optional/default-off: password fallback, external OCR, translation. Optional/user-permission: push. Capabilities expose booleans/health only.

## Background job rules

Database jobs are claimed atomically with lease owner/expiry, run through cPanel cron or explicitly supported short-lived Node/PHP runner, renew leases, and are idempotent. OCR, translation, rate refresh, report generation, notifications, deletion purge, and backup use bounded exponential retry and then visible manual/operator recovery. No permanent Node daemon is required.

## Backup contract

Create encrypted off-host database/config-metadata backups daily, retain seven daily and four weekly restore points, and keep the encryption key outside both cPanel and backup destination. Receipts/private artifacts are backed up consistently with database references. Monthly restore simulation reconstructs an isolated system and verifies database counts/checksums, receipt hashes, a closed Trip PDF, and audit-chain validity.

## Release procedure

Back up; enable maintenance if migration requires it; run forward-only idempotent migrations; require healthy schema/config; deploy compatible API; deploy static PWA; run smoke/simulation suite; retain compatible prior frontend/API assets for recovery. Do not reverse a data migration unless a separately rehearsed recovery plan proves it safe.

## Required evidence

Each structural PR stores results under `docs/evidence/<release>/`: command summary, schema verification, simulation report, 320/430 px screenshots when UI changes, PDF samples when reporting changes, external-feature configuration states, and backup-restore evidence when operations change. No secret, raw receipt, or real personal data enters evidence.

## Structural simulation matrix

Mandatory when schema, permissions, money/rates, sync/offline, authentication, or service-worker behavior changes: fresh install; idempotent migration rerun; legacy cutover count/checksum; role denial; passkey creation/session/recovery; all currency exponents/rate fallback/reconciliation; concurrent and offline edits; service-worker upgrade; 10-member/10,000-Expense pagination; five-minute/256 MB PDF; receipt attack cases; provider/push outage; deletion purge; off-host restore.

## Acceptance

Interactive list requests meet p95 under two seconds at target scale. PDF completes within five minutes and 256 MB. Summarized operational notifications link to detailed safe errors. Backup, migration, health, and restore evidence is current. Every release blocker is closed; optional automated tests may be scoped to changed behavior, but applicable structural simulation is never skipped.
