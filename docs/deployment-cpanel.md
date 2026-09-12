# PackTally Deployment on cPanel

## Host preflight

Confirm PHP 8+, PDO MySQL, OpenSSL, mbstring, HTTPS/AutoSSL, cPanel cron, private storage outside `public_html`, outbound HTTPS, MySQL backups, and a supported build Node version. The production design must work without a persistent Node process.

## Layout

Place static frontend assets in the site document root. Place PHP API code under `api/`. Configure private receipt/report storage outside the document root. Keep `api/config.php`, backup keys, recovery-secret source, and provider credentials outside Git and outside browser-delivered files.

## Deployment order

1. Verify encrypted off-host backup and keep the prior static bundle.
2. Deploy compatible backend/migration code.
3. Run the CLI migration command; refuse HTTP migration execution.
4. Require healthy schema/config from the health endpoint.
5. Deploy the matching static build and service worker.
6. Smoke-test HTTPS, passkey sign-in, load/save, offline queue, PDF, and enabled capabilities.
7. Save evidence under `docs/evidence/<release>/`.

If a post-migration frontend failure occurs, restore the prior compatible frontend/API layer. Do not roll database migrations back without a rehearsed recovery procedure.

## Cron jobs

Use a lock/lease to prevent concurrent runs. Separate short jobs for rate refresh, queued report/OCR/translation work, expired artifact/deletion purge, notification delivery, backup, and health summary. Each job is idempotent, bounded, and records failure for the operations summary.
