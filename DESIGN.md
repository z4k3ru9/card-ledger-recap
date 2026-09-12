# PackTally Design Contract

Status: accepted baseline (2026-09-12)

This document governs PackTally's visual language and interaction behavior. It complements [`CONTEXT.md`](CONTEXT.md), [`docs/packtally/PRD.md`](docs/packtally/PRD.md), and [`docs/packtally/UX-USER-FLOWS.md`](docs/packtally/UX-USER-FLOWS.md): requirements define what the system does; this contract defines how it should feel and remain understandable on a phone.

## Product feel

PackTally is a calm, trustworthy travel ledger: quick with one hand, explicit about uncertainty, and quiet about decoration. Financial facts, save state, and the next safe action outrank branding or dashboard ornament.

Use the semantic tokens in `src/index.css` as the color source of truth; do not add page-specific hex colors. Preserve these roles: Primary (one important action), Muted (supporting context), Accent (selection), Success (saved/confirmed), Warning (estimated/pending/offline), and Destructive (deletion/revocation/errors).

## Typography and numbers

- Use Geist Variable through the existing `font-sans` stack; headings use sentence case.
- Money and rates use locale-aware formatting with tabular numerals.
- Show the currency code beside an amount whenever multiple currencies can appear.
- English is default and Indonesian is secondary; domain components do not hard-code copy.

## Layout and responsive behavior

- Mobile is primary: 16 px side gutters, stacked cards, one clear primary action.
- Primary controls are at least 44 × 44 px with visible focus styling.
- Sticky summaries never cover save actions, errors, or sheet controls.
- Sheets/dialogs use existing shadcn primitives, restore focus, and include cancel/close.
- Desktop tables are secondary; no primary task depends on horizontal scrolling.
- PDF export defaults to portrait A4; wide tables may use landscape A4.

## Information hierarchy

An expense card presents merchant/date; original amount/currency; IDR estimate and rate provenance; payer/beneficiaries; split method/allocation; receipt/OCR state; then contextual actions. Do not duplicate totals in competing cards. Balances lead with net position and its derivation. Settlement distinguishes proposed, rejected, confirmed, reversed, and closed states.

## Interaction and state patterns

Persistent global labels are `Saved`, `Saving`, `Offline—saved on this device`, `Needs attention`, and `Error`. A spinner alone is never evidence of persistence. Use inline status for the edited item, toasts for short summaries, and banners/blocking sheets for pending rates, conflicts, invalid allocations, or destructive consequences. Draft expenses stay in `Drafts` and are excluded from totals. Autosave may push automatically, but mutations remain idempotent and expose sync/conflict state.

## Receipts, privacy, and accessibility

Receipt capture is prominent beside manual entry. Redaction/compression precedes upload; OCR/translation remain suggestions with original text, confidence/provider state, and field confirmation. Disabled providers never remove manual entry. Never expose restricted receipt links in another participant's UI or PDF. Push may identify a merchant and summary, never an amount. Focus is visible/restored, transitions are announced, icon-only controls are named, errors identify the field/expense and next action, and color is never the only state signal.

## Prohibited drift

No decorative gradients, unlabeled icon actions, silent currency conversion, hidden blockers, competing primary buttons, or new primitives when an existing shadcn component covers the interaction. Intentional exceptions belong in an ADR or design review note.

## Traceability

Screen behavior: [`docs/packtally/UX-USER-FLOWS.md`](docs/packtally/UX-USER-FLOWS.md). Delivery stages: [`docs/packtally/STAGED-SPECS.md`](docs/packtally/STAGED-SPECS.md). Visual findings belong in `design-plans/` with screenshots or reproduction notes.
