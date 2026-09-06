export type CashType = 'deposit' | 'debit'

export interface TransactionRow {
  id: string
  date: string
  description: string
  amount: number
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
  amount: number
}

/** One month's worth of bank + cash data, keyed by "YYYY-MM" in AppState. */
export interface MonthRecap {
  banks: BankBlock[]
  cashRows: CashRow[]
}

export type RecapsByMonth = Record<string, MonthRecap>
