import { Trash2 } from 'lucide-react'
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
import type { BankBlock, TransactionRow } from '@/lib/types'

interface BankCardProps {
  bank: BankBlock
  onChange: (bank: BankBlock) => void
  onRemove: () => void
}

export function BankCard({ bank, onChange, onRemove }: BankCardProps) {
  const subtotal = bank.transactions.reduce((sum, r) => sum + r.amount, 0)
  const palette = paletteFor(bank.colorIndex)

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

  return (
    <Card className={cn('border-t-4', palette.accentBorder)}>
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
              <TableHead className="w-40">Date</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="w-40 text-right">Amount</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {bank.transactions.map((row) => (
              <TableRow key={row.id}>
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
        <p className="mt-2 text-xs text-muted-foreground">
          A new row is added automatically once you fill in the last one.
        </p>
      </CardContent>
    </Card>
  )
}
