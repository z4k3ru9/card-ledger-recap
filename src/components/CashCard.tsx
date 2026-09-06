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
import type { CashRow } from '@/lib/types'

interface CashCardProps {
  rows: CashRow[]
  onChange: (rows: CashRow[]) => void
}

function newRow(): CashRow {
  return {
    id: crypto.randomUUID(),
    date: '',
    type: 'debit',
    description: '',
    amount: 0,
  }
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
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function removeRow(id: string) {
    onChange(rows.filter((row) => row.id !== id))
  }

  function addRow() {
    onChange([...rows, newRow()])
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Cash</CardTitle>
        <span className="text-sm font-medium text-muted-foreground">
          Net cash:{' '}
          <span className="text-foreground">{formatCurrency(net)}</span>
        </span>
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
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-sm text-muted-foreground"
                >
                  No cash transactions yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
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
        <Button variant="outline" size="sm" className="mt-3" onClick={addRow}>
          <Plus className="size-4" />
          Add Cash Entry
        </Button>
      </CardContent>
    </Card>
  )
}
