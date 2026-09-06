# Card Ledger Recap

A monthly credit card usage recap tool. Manually enter each bank's
statement items and any cash deposits/debits, and export a clean PDF
recap for the month.

## Features

- Add one or more banks via a dropdown (with a custom "Other" option)
- Enter statement items per bank, each with a date, description, and
  amount — banks are subtotaled automatically
- Track cash deposits and debits separately, with a running net cash
  figure
- Export the full recap (per-bank tables, cash table, and summary) to
  PDF for any selected month

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
