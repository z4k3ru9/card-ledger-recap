import { Trash2 } from 'lucide-react'
import { AmountInput } from '@/components/AmountInput'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'
import { CASH_PALETTE } from '@/lib/palette'
import { createCashRow, isRowEmpty, withTrailingEmptyRow } from '@/lib/rows'
import { ITEM_SUGGESTIONS_LIST_ID } from '@/lib/itemSuggestions'
import { cn } from '@/lib/utils'
import type { CashRow } from '@/lib/types'

interface CashCardProps {
  rows: CashRow[]
  onChange: (rows: CashRow[]) => void
}

export function CashCard({ rows, onChange }: CashCardProps) {
  const deposits = rows
    .filter((r) => r.type === 'deposit')
    .reduce((sum, r) => sum + r.amount, 0)
  const debits = rows
    .filter((r) => r.type === 'debit')
    .reduce((sum, r) => sum + r.amount, 0)
  const net = deposits - debits

  function updateRow(id: string, patch: Partial<CashRow>) {
    const updated = rows.map((row) =>
      row.id === id ? { ...row, ...patch } : row,
    )
    onChange(withTrailingEmptyRow(updated, createCashRow))
  }

  function removeRow(id: string) {
    const remaining = rows.filter((row) => row.id !== id)
    onChange(withTrailingEmptyRow(remaining, createCashRow))
  }

  return (
    <Card className={cn('border-t-4', CASH_PALETTE.accentBorder)}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className={cn('text-base', CASH_PALETTE.heading)}>
          Cash
        </CardTitle>
        <Badge
          variant="outline"
          className={cn(
            'border-transparent font-semibold',
            CASH_PALETTE.badgeBg,
            CASH_PALETTE.badgeText,
          )}
        >
          Net cash: {formatCurrency(net)}
        </Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Date</TableHead>
              <TableHead className="w-32">Type</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="w-40 text-right">Amount</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className="animate-in fade-in-0 slide-in-from-top-2 duration-300"
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
                  <Select
                    value={row.type}
                    onValueChange={(value) =>
                      updateRow(row.id, {
                        type: value as CashRow['type'],
                      })
                    }
                  >
                    <SelectTrigger className="w-full min-w-[110px]">
                      <SelectValue>
                        {(value: unknown) =>
                          value === 'deposit' ? 'Deposit' : 'Debit'
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="debit">Debit</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="e.g. ATM withdrawal, Petty cash"
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
                    disabled={rows.length === 1 && isRowEmpty(row)}
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
              <TableCell colSpan={3} className="text-muted-foreground">
                Deposits: {formatCurrency(deposits)} · Debits:{' '}
                {formatCurrency(debits)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(net)}
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
