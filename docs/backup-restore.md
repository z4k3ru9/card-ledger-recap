# PackTally Backup and Restore

## Policy

Create encrypted off-host backups daily; retain seven daily and four weekly points. The encryption key must be outside both cPanel and the backup destination. Back up database rows, private artifact metadata/hashes, and configuration metadata that excludes secrets.

## Restore simulation

Monthly, restore the latest artifact only into an explicitly isolated non-production database/storage root. Verify row counts/checksums, receipt hashes, migration state, audit-chain integrity, and generation of one closed-Trip PDF. Record only safe result summaries under `docs/evidence/<release>/`.

## Restore restrictions

The restore command must refuse a DSN/storage root that matches production. It must not alter the live migration ledger, private files, or service-worker assets. A failed verification preserves the artifact and raises an operational alert.

## Incident recovery

For a live loss, first preserve the affected state and current backup artifacts. Restore into isolation, verify, plan a controlled cutover, and retain an incident audit record. Do not overwrite production merely because a backup exists.
