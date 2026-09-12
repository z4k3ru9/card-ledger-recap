# Security and secrets

This document contains operational security guidance that is intentionally kept out of the short project README.

## Secrets and local files

- Never commit `api/config.php`; it contains database credentials and is ignored by git.
- Keep the database password in the hosting secret manager or server configuration where available.
- Do not put database credentials, app passwords, session values, or passkey material in frontend code, logs, screenshots, or issue reports.
- `api/config.sample.php` is safe to commit because it contains placeholders only.
- `api/vendor/` and local frontend dependencies are not source secrets, but should not be committed.

## Authentication

- The app uses one shared password rather than individual user accounts.
- The password is stored only as a bcrypt hash in the `auth` table.
- Sign-in creates a server-side PHP session. The browser receives an HTTP-only, `SameSite=Lax` session cookie; it does not receive a database credential or encryption key.
- Everyone who can sign in can view and edit every stored month.
- There is no self-service password reset. An administrator with direct database access must replace the stored hash with a newly generated bcrypt hash.

## Passkeys

Passkeys are optional. A signed-in user can register a device passkey and use it instead of the shared password.

- Registration requires an existing authenticated session.
- Passkeys require HTTPS, except during local development on `localhost`.
- Test a passkey login successfully before revoking the password.
- Revoking the password is irreversible from the UI and makes registered passkeys the only login method.
- The app prevents revoking the password with zero passkeys and prevents deleting the last passkey after password access has been revoked.
- If every passkey is lost, an administrator must restore a password hash directly in the `auth` table.

## HTTPS and hosting

Use HTTPS in production. Without it, passwords and session cookies can be intercepted, and WebAuthn passkeys will not work.

Restrict access to cPanel, phpMyAdmin, SFTP, the database, and server backups. Anyone with direct database access can read all recaps and reset authentication.

Keep `api/config.php` on the server only. When updating a deployment, upload backend files without overwriting the server's real `api/config.php`.

## Database contents

- `auth` — the shared password hash and WebAuthn user handle.
- `sessions` — server-side login sessions.
- `recaps` — one JSON recap per `YYYY-MM` month.
- `webauthn_credentials` — registered passkey public credentials and usage metadata.

The schema is intentionally minimal. It does not create per-user permissions or an audit history, so this app is suitable for a trusted shared workspace rather than a multi-tenant financial system.
