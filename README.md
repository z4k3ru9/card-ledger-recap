# Card Ledger Recap

A small monthly worksheet for recording credit-card statement items, optional cash movements, and exporting a PDF recap.

## What it does

- Track statement lines by bank: date, description, and amount.
- Track optional cash deposits and debits.
- Keep each month separate with automatic saving.
- Export the selected month as a PDF in Bahasa Indonesia.
- Share one protected recap workspace across the people who use it.

## Stack

- React + Vite + TypeScript
- shadcn/ui with Base UI
- PHP + MySQL API
- jsPDF for PDF export

## Local setup

Requirements: Node.js, PHP 8+, Composer, and MySQL.

1. Install frontend dependencies:

   ```bash
   npm install
   ```

2. Create the database and tables:

   ```bash
   mysql -u <user> -p <database> < api/schema.sql
   ```

3. Create `api/config.php` from `api/config.sample.php` and add the database connection values.

4. Install the PHP dependency:

   ```bash
   cd api && composer install
   ```

5. Start the app in two terminals:

   ```bash
   npm run dev:api
   npm run dev
   ```

Open <http://localhost:5173>.

## Build

```bash
npm run build
```

The frontend is written to `dist/`. The PHP files under `api/` must be deployed alongside it.

## Deploy

For a typical cPanel or LAMP host:

1. Build the frontend and install the PHP dependency.
2. Import `api/schema.sql` into MySQL.
3. Create `api/config.php` on the server from the sample file.
4. Upload the contents of `dist/` and the `api/` directory next to each other.
5. Enable HTTPS, open the site, and set the app password on first load.

The app uses relative paths, so the same files can run at the domain root or in a subfolder.

See [docs/SECURITY.md](docs/SECURITY.md) for credentials, sessions, passkeys, HTTPS, recovery, and deployment security guidance.

## Project layout

- `src/` — frontend application and UI components
- `api/` — PHP endpoints and database schema
- `public/` — static assets
- `dist/` — production frontend output
