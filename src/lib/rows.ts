import type { CashRow, MonthRecap, TransactionRow } from './types'

type EntryLike = Pick<TransactionRow, 'date' | 'description' | 'amount'>

export function createTransactionRow(): TransactionRow {
  return { id: crypto.randomUUID(), date: '', description: '', amount: 0 }
}

export function createCashRow(): CashRow {
  return {
    id: crypto.randomUUID(),
    date: '',
    type: 'debit',
    description: '',
    amount: 0,
  }
}

/** A blank recap for a month nothing has been entered for yet. */
export function createEmptyRecap(): MonthRecap {
  return { banks: [], cashRows: [createCashRow()] }
}

export function isRowEmpty(row: EntryLike): boolean {
  return !row.date && !row.description && row.amount === 0
}

/**
 * Keeps exactly one blank row ready at the end of the list, so a new
 * transaction is auto-added the moment the current last row gets any
 * data - no explicit "Add" button needed. Also guarantees the list is
 * never fully empty.
 *
 * Also collapses any *other* row that's been edited back down to blank
 * (e.g. typing an amount/item with no date yet, then deleting it again)
 * - otherwise it would linger as a second, stray blank row instead of
 * disappearing, since only the very last row was ever checked for
 * emptiness. The already-blank trailing row's identity is reused when
 * there is one, so unrelated edits elsewhere don't remount it.
 */
export function withTrailingEmptyRow<T extends EntryLike>(
  rows: T[],
  makeEmpty: () => T,
): T[] {
  const trailingEmpty =
    rows.length > 0 && isRowEmpty(rows[rows.length - 1])
      ? rows[rows.length - 1]
      : null
  const filled = rows.filter(
    (row) => row !== trailingEmpty && !isRowEmpty(row),
  )
  return [...filled, trailingEmpty ?? makeEmpty()]
}
