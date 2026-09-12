# Recap Surface Polish and Reliability

Written against: `654f0de`

## Evidence chain

- Surface: authenticated monthly recap worksheet (`src/App.tsx` → `BankCard`, `CashCard`, shared UI primitives)
- Problem: the surface has a clearer editorial shell, but its shared primitives still apply inconsistent radius and motion rules; the month autosave path also has no regression coverage around its state boundaries.
- Design evidence: the user-selected `better-ui` contract requires concentric radii, exact-property transitions, and `scale(0.96)` press feedback; the user-selected `improve-ui` contract requires preserving existing owners and validating one coherent surface.
- Owner: `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, and the monthly orchestration in `src/App.tsx`.
- Scope and affected surfaces: authenticated recap worksheet, bank/cash entry cards, header actions, month switching, and autosave.
- Uncertainty: visual spacing and responsive behavior remain not verified in a browser.

## Design decision

Keep the Swiss recap direction and simplify the shared primitives underneath it: use one radius contract derived from `--radius`, replace broad button transitions with exact color/transform transitions, and give press feedback a consistent `scale(0.96)`. Move recap persistence timing into a small typed hook or pure scheduler boundary so month switching cannot accidentally save the wrong month and the behavior can be tested without rendering the entire app.

## Reuse

- `--radius` and its `--radius-*` aliases in `src/index.css`
- `buttonVariants` in `src/components/ui/button.tsx`
- `Card` / `CardHeader` in `src/components/ui/card.tsx`
- `withTrailingEmptyRow` and `isRowEmpty` in `src/lib/rows.ts`
- Exemplar: existing bank/cash card composition in `src/components/BankCard.tsx` and `src/components/CashCard.tsx`

## Changes

1. `src/components/ui/card.tsx` and `src/components/ui/button.tsx`
   - Change: make outer and inner radii derive from the same token relationship; replace `transition-all` with explicit color, opacity, and transform transitions; replace the current one-pixel press translation with `scale(0.96)` while retaining visible hover/focus cues.
   - Preserve: existing variants, sizes, Base UI ownership, and the current red/white visual direction.
   - Verify: cards have concentric corners at default and small sizes; buttons animate only the properties that change and feel identical across header, bank, cash, and dialog actions.

2. `src/App.tsx` and a new focused persistence helper under `src/lib/`
   - Change: isolate the debounced save contract so it receives an explicit month and recap snapshot, cancels on month changes/unmount, and exposes a testable boundary for success/failure feedback.
   - Preserve: 600ms debounce semantics, per-month storage, autosave to the existing `recaps.php` endpoint, and the current user-facing toast copy.
   - Verify: edit month A, switch to month B before the timer fires, and confirm the pending request still targets month A’s snapshot; confirm a new month starts with one blank cash row and never persists a stale month key.

3. `src/lib/rows.ts` and the PDF/summary consumers
   - Change: centralize “filled entry” filtering or totals so blank trailing rows are excluded consistently from UI totals, PDF rows, and future tests.
   - Preserve: exactly one editable blank row at the end of bank and cash lists.
   - Verify: adding, clearing, deleting, and switching rows never changes totals because of the blank row and the PDF contains only filled entries.

## Scope

- Inherit: all consumers of shared `Button` and `Card` primitives.
- Verify: mobile header wrapping, empty-month state, one-bank state, many-bank state, and the passkey dialog because it shares the header action row.
- Exclude: schema changes, new recap fields, account model changes, and new month lifecycle states.

## Validation

- Product: enter a bank line and cash line, switch months during autosave, return to the first month, and export a PDF; all values and totals remain correct.
- Interface: inspect loading, empty, populated, hover, focus-visible, disabled, active, and error-toast states at narrow mobile and desktop widths.
- System: confirm no parallel button/card styling is introduced and existing palette/token owners remain canonical.
- Repository: `npx tsc -b` → passes; add and run focused unit tests for persistence scheduling and row normalization; run `npm run build` under a Node version supported by the repository → expected successful bundle.

## Stop conditions

- Stop if the current deployment requires the existing rounded geometry or if browser inspection reveals a deliberate exception not documented in source.
- Stop if persistence behavior requires changing the API contract or schema; that is outside this polish scope.

## Design documentation

- After acceptance and validation: no design documentation currently exists; record the chosen radius/motion contract in a future `DESIGN.md` only if the project will add a durable design system.
