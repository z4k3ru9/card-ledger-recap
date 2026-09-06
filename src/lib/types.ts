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
  transactions: TransactionRow[]
}

export interface CashRow {
  id: string
  date: string
  type: CashType
  description: string
  amount: number
}
