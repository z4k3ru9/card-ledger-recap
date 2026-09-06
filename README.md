# Card Ledger Recap

A monthly credit card usage recap tool. Manually enter each bank's
statement items and any cash deposits/debits, and export a clean PDF
recap for the month.

## Features

- Add one or more banks via a dropdown (with a custom "Other" option)
- Enter statement items per bank, each with a date, description, and
  amount — banks are subtotaled automatically; a new blank row is added
  automatically once you fill in the last one
- Track cash deposits and debits separately, with a running net cash
  figure
- Each month keeps its own recap automatically, stored centrally in a
  shared MySQL database as you go — see [Architecture](#architecture)
  below
- Password-protected with a conventional server-side login (PHP session,
  bcrypt-hashed password) — see [Security model](#security-model) below
- Export the full recap (per-bank tables, cash table, and summary) to
  a PDF in Bahasa Indonesia, for any selected month

## Tech stack

- [React](https://react.dev/) + [Vite](https://vite.dev/) (frontend, fully static)
- [shadcn/ui](https://ui.shadcn.com/)
- [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- PHP + MySQL (backend API under `api/` — see below)

## Architecture

This app has two parts, both plain enough to run on ordinary shared
hosting (no Node.js needed in production):

- **Frontend** (`src/`): a static React app, built with `npm run build`
  into `dist/`. It never talks to MySQL directly — it calls the PHP API.
- **Backend** (`api/`): a handful of small PHP scripts, no framework,
  behind a single shared MySQL database (`api/schema.sql`):
  - `auth` — one row holding the shared app password's bcrypt hash.
  - `sessions` — login sessions. The login cookie is a normal PHP
    session, but its data is stored in this table (see
    `api/lib/SessionHandler.php`) instead of the server's local
    filesystem, so it survives however cPanel/shared hosting happens to
    run PHP.
  - `recaps` — one row per month (`"YYYY-MM"`), holding that month's
    whole recap (banks + cash rows) as a JSON blob.

  Endpoints: `status.php` (GET), `setup.php` / `login.php` / `logout.php`
  (POST), and `recaps.php` (GET for everything, POST `{ month, recap }`
  to upsert one month). All except `status.php`/`setup.php`/`login.php`
  require an authenticated session.

Since the recap data lives in one shared database, everyone who knows
the app password sees the same months and edits — this is intentionally
"one shared login", not per-person accounts.

### Database schema

The canonical schema lives in [`api/schema.sql`](api/schema.sql) (import
it as described in [Backend setup](#backend-setup) below) — three
tables, kept intentionally minimal:

- `auth` — a single row (id `1`) holding the shared app password's
  bcrypt hash. There's no other row and no plaintext password anywhere
  in it (see [Security model](#security-model)).
- `sessions` — login sessions, read/written entirely by
  [`api/lib/SessionHandler.php`](api/lib/SessionHandler.php); nothing
  else touches it directly. Expired rows age out via PHP's normal
  session garbage collection, same as file-based sessions.
- `recaps` — one row per month (`"YYYY-MM"`), holding that month's
  whole `{ banks, cashRows }` (see `RecapsByMonth` in
  `src/lib/types.ts`) as a JSON string, upserted by
  `POST /api/recaps.php`.

Every statement in the file is `CREATE TABLE IF NOT EXISTS`, so
re-running it against a database that already has these tables is a
no-op — safe to import again after pulling an update.

## Getting started

Install the frontend dependencies:

```bash
npm install
```

Set up the database and backend config locally (see
[Backend setup](#backend-setup) below), then run both dev servers:

```bash
npm run dev:api   # PHP built-in server, serves api/ on :8787
npm run dev       # Vite dev server on :5173, proxies /api to :8787
```

Open http://localhost:5173.

## Backend setup

Requires **PHP 8.0 or newer** (cPanel's "MultiPHP Manager" lets you pick
the version per domain) with the `pdo_mysql` extension, which is enabled
by default on virtually all PHP installs. Hitting any `api/` endpoint on
an older PHP returns a clear JSON error instead of a blank 500, so this
is easy to confirm after deploying.

1. Create a MySQL database (locally, or in cPanel's **MySQL Databases**)
   and import the schema once:
   ```bash
   mysql -u <user> -p <database> < api/schema.sql
   ```
2. Copy `api/config.sample.php` to `api/config.php` and fill in your
   database host/name/user/password. `api/config.php` is gitignored —
   never commit real credentials.
3. That's it — no migrations, no ORM. The first time anyone opens the
   app, they'll see "Set the app password" and can create it.

## Build

```bash
npm run build
```

This produces a `dist/` folder — a static frontend build. It needs the
`api/` PHP backend (with a real `api/config.php`) reachable at the same
domain under `/api` to actually work; see
[Deploying to cPanel](#deploying-to-cpanel-or-any-lamp-host) below.

## Security model

- The shared app password is never stored in plain text — only its
  bcrypt hash (`password_hash()`/`password_verify()` in PHP), in the
  `auth` table.
- Logging in starts a normal server-side session; the browser only ever
  holds an httpOnly, `SameSite=Lax` session cookie (and `Secure` when
  served over HTTPS) — never the password or a decryption key.
- It's one shared password for everyone who has it, not per-person
  accounts, and all recap data is centrally stored — everyone with the
  password sees the same data.
- There is no self-service password reset. If it's forgotten, whoever
  has direct database access can set a new one by replacing the
  `password_hash` value in the `auth` table with a fresh bcrypt hash
  generated server-side (`password_hash()`) — never store or transmit
  the plaintext password to do this.
- Restrict who can reach phpMyAdmin/database tools and the hosting
  control panel itself — anyone with direct database access can read
  every recap and reset the app password, so treat that access with the
  same care as the app password.
- **Use HTTPS in production.** The password is sent to the login
  endpoint on every sign-in; without HTTPS it (and the session cookie)
  travel in the clear. Enable a free SSL certificate (cPanel's AutoSSL
  or Let's Encrypt) before pointing real users at this.

## Deploying to cPanel (or any LAMP host)

1. Locally or in CI: `npm install && npm run build`.
2. In cPanel's **MySQL Databases**, create a database + user (grant it
   all privileges on that database), then import `api/schema.sql` via
   phpMyAdmin's **Import** tab (or `mysql -u ... -p ... < api/schema.sql`
   if you have shell/SSH access).
3. Enable a free SSL certificate for the domain/subdomain first, via
   cPanel's **SSL/TLS Status** → **AutoSSL**, or **Let's Encrypt** if
   your host offers it (see [Security model](#security-model) above).
4. Upload both of these into `public_html` (or a subfolder, for a
   subdomain/`/some-path/` deployment):
   - the *contents* of `dist/` (not the `dist` folder itself)
   - the `api/` folder as-is, with `api/config.php` created from
     `api/config.sample.php` and filled in with the database
     credentials from step 2 (do this upload over SFTP/File Manager,
     not by committing it to git)
5. Visit the domain — you should land on "Set the app password" on
   first load.

Since asset paths in the build are relative and the frontend calls the
API at the relative path `api/...`, the same upload works whether it
ends up served from the domain root or a subfolder — no path
configuration needed either way, as long as `api/` sits next to
`index.html`.

To update a live deployment, rebuild and re-upload the contents of
`dist/` (and `api/`, if backend code changed — never re-upload
`api/config.php` from git, it isn't tracked there). Nothing needs to be
"installed" or restarted, since PHP is invoked fresh per request by the
web server.
