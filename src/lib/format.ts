import type { MinorUnits } from './money'
import { isMinorUnits } from './money'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function formatCurrency(amount: MinorUnits): string {
  if (!isMinorUnits(amount)) return 'Rp —'
  return currencyFormatter.format(amount)
}

export function formatMonthLabel(monthValue: string): string {
  // monthValue is "YYYY-MM" from <input type="month">
  const [year, month] = monthValue.split('-').map(Number)
  if (!year || !month) return monthValue
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Indonesian-language variants, used for the exported PDF.
export function formatMonthLabelID(monthValue: string): string {
  const [year, month] = monthValue.split('-').map(Number)
  if (!year || !month) return monthValue
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

export function formatDateLabelID(dateValue: string): string {
  if (!dateValue) return ''
  const [year, month, day] = dateValue.split('-').map(Number)
  if (!year || !month || !day) return dateValue
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
