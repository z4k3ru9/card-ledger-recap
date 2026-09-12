# PackTally

PackTally records shared travel spending, estimates cross-currency obligations, and produces an accountable IDR recap and settlement without moving money.

## People and access

**Account**:
A person’s PackTally identity, referenced internally by an immutable ID and entered primarily through passkeys.
_Avoid_: User profile, shared login

**Trip Member**:
An Account participating in one Trip under an Owner or Contributor role and a trip-specific display name.
_Avoid_: User, guest

**Owner**:
The Trip Member accountable for membership, lifecycle, cross-person corrections, and complete trip administration.
_Avoid_: Admin

**Contributor**:
A Trip Member who controls their own Expenses, allocations, and repayments.
_Avoid_: Guest, editor

**Verified Operator**:
The person using the non-web cPanel recovery procedure; not a Trip Member role.
_Avoid_: Super-admin

## Travel ledger

**Trip**:
The shared travel-expense ledger that moves through Draft, Active, Settling, and Closed states.
_Avoid_: Month, recap

**Expense**:
A dated original-currency amount paid by one Trip Member for one or more beneficiaries.
_Avoid_: Transaction, row, statement item

**Allocation**:
The exact distribution of an Expense among its beneficiaries using equal, exact, percentage, or weighted shares.
_Avoid_: Split row

**Adjustment**:
A linked refund, fee, tip, discount, or correction that preserves the Expense’s history.
_Avoid_: Edited amount

**Rate Snapshot**:
The immutable exchange-rate evidence attached to an Expense or Repayment, including source, effective date, retrieved time, and estimate status.
_Avoid_: Current rate, live conversion

**Statement Reconciliation**:
The owner-confirmed replacement of an estimated IDR conversion with an actual card-statement IDR amount while preserving both values.
_Avoid_: Rate edit

**Settlement Run**:
A reproducible calculation of IDR balances and minimized payment obligations from a fixed ledger revision.
_Avoid_: Payment

**Repayment**:
Money transferred outside PackTally and recorded as proposed until its recipient confirms receipt.
_Avoid_: In-app payment

## Evidence and history

**Receipt**:
The cropped/redacted, metadata-stripped image accepted for upload; the pre-redaction device image is never a PackTally record.
_Avoid_: Raw original

**Legacy Recap**:
An immutable read-only copy of one pre-PackTally monthly JSON recap and its original revision.
_Avoid_: Migrated trip

**Audit Event**:
An append-only, hash-chained record of a financial, membership, lifecycle, or recovery action.
_Avoid_: Log line
