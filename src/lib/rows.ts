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
 */
export function withTrailingEmptyRow<T extends EntryLike>(
  rows: T[],
  makeEmpty: () => T,
): T[] {
  if (rows.length === 0) return [makeEmpty()]
  const last = rows[rows.length - 1]
  return isRowEmpty(last) ? rows : [...rows, makeEmpty()]
}
