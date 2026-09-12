import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Trash2 } from 'lucide-react'
import { AmountInput } from '@/components/AmountInput'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { paletteFor } from '@/lib/palette'
import { createTransactionRow, isRowEmpty, withTrailingEmptyRow } from '@/lib/rows'
import { ITEM_SUGGESTIONS_LIST_ID } from '@/lib/itemSuggestions'
import type { BankBlock, TransactionRow } from '@/lib/types'

interface BankCardProps {
  bank: BankBlock
  onChange: (bank: BankBlock) => void
  onRemove: () => void
  /** True for exactly one render right after this bank was added. */
  justAdded?: boolean
  /** Called once the just-added scroll/focus has happened. */
  onFocused?: () => void
}

type SortDir = 'asc' | 'desc'

// Rows with no date yet always sort after every dated row, in either
// direction - there's nothing "logical" to say about their order yet.
function compareByDate(a: TransactionRow, b: TransactionRow, dir: SortDir) {
  if (!a.date && !b.date) return 0
  if (!a.date) return 1
  if (!b.date) return -1
  return dir === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
}

export function BankCard({
  bank,
  onChange,
  onRemove,
  justAdded,
  onFocused,
}: BankCardProps) {
  const [sortDir, setSortDir] = useState<SortDir | null>(null)
  const subtotal = bank.transactions.reduce((sum, r) => sum + r.amount, 0)
  const palette = paletteFor(bank.colorIndex)
  const cardRef = useRef<HTMLDivElement>(null)

  // Bring a freshly-added bank into view instead of leaving the user to
  // scroll down and find it themselves. Scrolled to manually (not
  // scrollIntoView + a fixed scroll-margin) because the sticky header's
  // height varies a lot - short on desktop, much taller on narrow phones
  // where the title wraps to two lines - so only measuring it live gets
  // the offset right everywhere. Focus lands on the card itself (not a
  // specific field), so this doesn't pop open a native date picker or
  // the on-screen keyboard.
  useEffect(() => {
    if (!justAdded || !cardRef.current) return
    const header = document.querySelector('header')
    const headerHeight = header?.getBoundingClientRect().height ?? 0
    const rect = cardRef.current.getBoundingClientRect()
    const fullyVisible = rect.top >= headerHeight && rect.bottom <= window.innerHeight
    if (!fullyVisible) {
      const cardTop = rect.top + window.scrollY
      window.scrollTo({ top: cardTop - headerHeight - 16, behavior: 'smooth' })
    }
    cardRef.current.focus({ preventScroll: true })
    onFocused?.()
  }, [justAdded, onFocused])

  function updateRow(id: string, patch: Partial<TransactionRow>) {
    const updated = bank.transactions.map((row) =>
      row.id === id ? { ...row, ...patch } : row,
    )
    onChange({
      ...bank,
      transactions: withTrailingEmptyRow(updated, createTransactionRow),
    })
  }

  function removeRow(id: string) {
    const remaining = bank.transactions.filter((row) => row.id !== id)
    onChange({
      ...bank,
      transactions: withTrailingEmptyRow(remaining, createTransactionRow),
    })
  }

  function handleSortByDate() {
    const nextDir: SortDir = sortDir === 'asc' ? 'desc' : 'asc'
    setSortDir(nextDir)
    // The always-blank trailing row stays last no matter what - only the
    // rows that actually have data get reordered.
    const trailing = bank.transactions[bank.transactions.length - 1]
    const hasTrailingBlank = trailing && isRowEmpty(trailing)
    const filled = hasTrailingBlank
      ? bank.transactions.slice(0, -1)
      : bank.transactions
    const sorted = [...filled].sort((a, b) => compareByDate(a, b, nextDir))
    onChange({
      ...bank,
      transactions: hasTrailingBlank ? [...sorted, trailing] : sorted,
    })
  }

  return (
    <Card
      ref={cardRef}
      tabIndex={-1}
      className={cn(
        'animate-in fade-in-0 border-t-4 outline-none duration-300',
        palette.accentBorder,
      )}
    >
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className={cn('text-base', palette.heading)}>
          {bank.bankName}
        </CardTitle>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              'border-transparent font-semibold',
              palette.badgeBg,
              palette.badgeText,
            )}
          >
            Subtotal: {formatCurrency(subtotal)}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label={`Remove ${bank.bankName}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">
                <button
                  type="button"
                  onClick={handleSortByDate}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  aria-label="Sort by date"
                  title="Sort by date"
                >
                  Date
                  {sortDir === 'asc' ? (
                    <ArrowUp className="size-3.5" />
                  ) : sortDir === 'desc' ? (
                    <ArrowDown className="size-3.5" />
                  ) : (
                    <ArrowUpDown className="size-3.5 opacity-50" />
                  )}
                </button>
              </TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="w-40 text-right">Amount</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {bank.transactions.map((row) => (
              <TableRow
                key={row.id}
                className="animate-in fade-in-0 duration-300"
              >
                <TableCell>
                  <Input
                    type="date"
                    className="w-[150px] min-w-[150px]"
                    value={row.date}
                    onChange={(e) =>
                      updateRow(row.id, { date: e.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="e.g. Groceries, Fuel, Subscription"
                    className="min-w-[200px]"
                    list={ITEM_SUGGESTIONS_LIST_ID}
                    value={row.description}
                    onChange={(e) =>
                      updateRow(row.id, { description: e.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <AmountInput
                    className="min-w-[120px] text-right"
                    value={row.amount}
                    onChange={(amount) => updateRow(row.id, { amount })}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(row.id)}
                    disabled={
                      bank.transactions.length === 1 && isRowEmpty(row)
                    }
                    aria-label="Remove row"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="text-muted-foreground">
                Subtotal
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(subtotal)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  )
}
