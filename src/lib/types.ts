import type { MinorUnits } from './money'

export type CashType = 'deposit' | 'debit'

export interface TransactionRow {
  id: string
  date: string
  description: string
  amount: MinorUnits
}

export interface BankBlock {
  id: string
  bankName: string
  colorIndex: number
  transactions: TransactionRow[]
}

export interface CashRow {
  id: string
  date: string
  type: CashType
  description: string
  amount: MinorUnits
}

/** One month's worth of bank + cash data, keyed by "YYYY-MM" in AppState. */
export interface MonthRecap {
  banks: BankBlock[]
  cashRows: CashRow[]
}

export type RecapsByMonth = Record<string, MonthRecap>

/** Server state used for optimistic concurrency on whole-month saves. */
export interface RecapCollection {
  recaps: RecapsByMonth
  revisions: Record<string, number>
}
