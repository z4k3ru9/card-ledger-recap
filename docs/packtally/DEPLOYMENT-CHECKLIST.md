# PackTally cPanel Deployment Checklist

1. Confirm PHP 8+, PDO MySQL, OpenSSL, mbstring, HTTPS, cron availability, writable private receipt storage, outbound HTTPS, and the configured Node build version (20.19+ or 22.12+).
2. Confirm `api/config.php` and all feature-provider keys are deployment secrets and absent from Git. Set every external feature flag deliberately.
3. Take and verify an encrypted off-host backup. Retain seven daily/four weekly restore points, keep its key outside cPanel and the backup destination, and keep the prior static `dist` bundle available.
4. Upload backend/migration code first. Run `php api/migrate.php` through SSH or an approved cPanel CLI; never expose the runner over HTTP.
5. Require `GET /api/health.php` to report `ok: true` with all required migration IDs before uploading the matching frontend.
6. Upload the static build, then smoke-test HTTPS, passkey sign-in, account session, load failure handling, save/reconnect, conflict handling, receipt authorization, and PDF generation.
7. Check the summarized operational dashboard for failed backups, provider outages, queue errors, and migration status. Investigate detailed errors before inviting users.
8. If frontend smoke tests fail after migration, restore the prior static build/API compatibility layer. Do not roll database migrations backward unless a separately tested recovery procedure explicitly permits it.
9. Monthly, restore the latest backup into an explicitly isolated non-production database and verify counts, checksums, receipt hashes, a closed-trip PDF, and the audit hash chain.
