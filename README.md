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
- Each month keeps its own recap automatically, saved (encrypted) in
  this browser as you go
- Password-protected: data is encrypted at rest in the browser using a
  key derived from your password (Web Crypto, PBKDF2 + AES-256-GCM) -
  see [Security model](#security-model) below
- Export the full recap (per-bank tables, cash table, and summary) to
  a PDF in Bahasa Indonesia, for any selected month

## Tech stack

- [React](https://react.dev/) + [Vite](https://vite.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)

## Getting started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

This produces a `dist/` folder - a fully static site (no server/backend
required). Everything below deploys that folder as-is.

## Security model

This is a static frontend with no backend, so "login" here means a
password that unlocks encryption, not a multi-user account system:

- The password is never stored anywhere. It's run through PBKDF2
  (250,000 iterations, SHA-256) to derive an AES-256-GCM key, and that
  key is what actually encrypts the saved recap data before it's
  written to the browser's `localStorage`.
- Only a random salt and an encrypted "verifier" (used to check a
  password attempt without ever persisting the real password) are
  stored, alongside the encrypted recap data itself.
- It's one shared password for whoever has it on that browser, not
  per-person accounts, and data doesn't sync across devices or
  browsers - there's no server involved.
- There is no password reset. If it's forgotten, the data cannot be
  decrypted by anyone (including the app itself) - "Forgot password?
  Reset app data" on the login screen is the only way out, and it
  deletes the encrypted data rather than recovering it.
- **This requires HTTPS.** The browser only exposes the Web Crypto API
  (`crypto.subtle`) in a secure context (HTTPS, or `localhost` during
  development). Served over plain HTTP, the app shows a clear "HTTPS
  required" message instead of the login screen.

## Deploying to cPanel (or any static host)

Since the build output is fully static, cPanel doesn't need Node.js,
npm, or any "Setup Node.js App" step running - you only need somewhere
to run `npm run build` once (your own machine, or a CI job), then
upload the result.

1. `npm install && npm run build` (do this locally or in CI - not on
   cPanel itself).
2. Enable a free SSL certificate for the domain/subdomain first, via
   cPanel's **SSL/TLS Status** → **AutoSSL**, or **Let's Encrypt** if
   your host offers it. The login/encryption feature needs HTTPS (see
   above); without it, the app shows the "HTTPS required" screen
   instead of loading.
3. In cPanel's **File Manager** (or via FTP/SFTP), upload the
   *contents* of `dist/` — not the `dist` folder itself — into
   `public_html` (for the domain root) or a subfolder under it (for a
   subdomain or a `/some-path/` deployment). A `.htaccess` file is
   included in that output for gzip compression and asset caching; it's
   safe to keep alongside any `.htaccess` cPanel already manages for
   the domain (merge them if cPanel's own file already has rules you
   need, e.g. a forced HTTPS redirect).
4. Visit the domain — you should land on the "Set an app password"
   screen on first load.

Since asset paths in the build are relative, the same `dist/` output
works whether it ends up served from the domain root or a subfolder -
no path configuration needed either way.

To update a live deployment, rebuild and re-upload the contents of
`dist/`, overwriting the previous files (keep the `.htaccess` if you've
customized it). Nothing needs to be "installed" or restarted on the
server since there's no backend process running.
