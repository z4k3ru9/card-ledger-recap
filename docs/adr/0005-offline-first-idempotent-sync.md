---
status: accepted
---

# Synchronize through account-scoped idempotent operations

Mobile edits are stored in an account-scoped encrypted local operation queue and replayed through idempotent mutations. Different Expenses synchronize independently; competing revisions of the same Expense stop for explicit comparison, because silent last-write-wins is unacceptable for shared financial data.
