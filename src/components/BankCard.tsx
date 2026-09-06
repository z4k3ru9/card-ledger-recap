import { Plus, Trash2 } from 'lucide-react'
import { AmountInput } from '@/components/AmountInput'
import { Button } from '@/components/ui/button'
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
import { formatCurrency } from '@/lib/format'
import type { BankBlock, TransactionRow } from '@/lib/types'

interface BankCardProps {
  bank: BankBlock
  onChange: (bank: BankBlock) => void
  onRemove: () => void
}

function newRow(): TransactionRow {
  return { id: crypto.randomUUID(), date: '', description: '', amount: 0 }
}

export function BankCard({ bank, onChange, onRemove }: BankCardProps) {
  const subtotal = bank.transactions.reduce((sum, r) => sum + r.amount, 0)

  function updateRow(id: string, patch: Partial<TransactionRow>) {
    onChange({
      ...bank,
      transactions: bank.transactions.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    })
  }

  function removeRow(id: string) {
    onChange({
      ...bank,
      transactions: bank.transactions.filter((row) => row.id !== id),
    })
  }

  function addRow() {
    onChange({ ...bank, transactions: [...bank.transactions, newRow()] })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{bank.bankName}</CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Subtotal:{' '}
            <span className="text-foreground">
              {formatCurrency(subtotal)}
            </span>
          </span>
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
            {bank.transactions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-sm text-muted-foreground"
                >
                  No transactions yet.
                </TableCell>
              </TableRow>
            )}
            {bank.transactions.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Input
                    type="date"
                    className="min-w-[150px]"
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
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={addRow}
        >
          <Plus className="size-4" />
          Add Transaction
        </Button>
      </CardContent>
    </Card>
  )
}
