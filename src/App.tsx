import { useState } from 'react'
import { FileDown, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AddBankControl } from '@/components/AddBankControl'
import { BankCard } from '@/components/BankCard'
import { CashCard } from '@/components/CashCard'
import { ThemeToggle } from '@/components/ThemeToggle'
import { formatCurrency, formatMonthLabel } from '@/lib/format'
import { paletteFor, CASH_PALETTE } from '@/lib/palette'
import { generateRecapPdf } from '@/lib/pdf'
import { createCashRow, createTransactionRow } from '@/lib/rows'
import type { BankBlock, CashRow } from '@/lib/types'

function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function App() {
  const [month, setMonth] = useState(currentMonthValue())
  const [banks, setBanks] = useState<BankBlock[]>([])
  const [cashRows, setCashRows] = useState<CashRow[]>(() => [createCashRow()])

  const bankTotal = banks.reduce(
    (sum, bank) =>
      sum + bank.transactions.reduce((s, r) => s + r.amount, 0),
    0,
  )
  const cashNet = cashRows.reduce(
    (sum, row) => sum + (row.type === 'deposit' ? row.amount : -row.amount),
    0,
  )
  const grandTotal = bankTotal + cashNet

  function addBank(bankName: string) {
    setBanks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        bankName,
        colorIndex: prev.length,
        transactions: [createTransactionRow()],
      },
    ])
  }

  function updateBank(updated: BankBlock) {
    setBanks((prev) =>
      prev.map((b) => (b.id === updated.id ? updated : b)),
    )
  }

  function removeBank(id: string) {
    setBanks((prev) => prev.filter((b) => b.id !== id))
  }

  function handleExport() {
    generateRecapPdf({ month, banks, cashRows })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CreditCard className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Monthly Credit Card Usage Recap
            </h1>
            <p className="text-sm text-muted-foreground">
              Track statement items per bank and cash movements, then export
              a PDF recap for {formatMonthLabel(month)}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="month">Recap month</Label>
            <Input
              id="month"
              type="month"
              className="w-40"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <Button onClick={handleExport}>
            <FileDown className="size-4" />
            Export PDF
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mt-6 flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4">
          <div>
            <p className="text-sm font-medium">Add a bank statement</p>
            <p className="text-xs text-muted-foreground">
              Pick a bank, then fill in each statement item manually below.
            </p>
          </div>
          <AddBankControl
            existingNames={banks.map((b) => b.bankName)}
            onAdd={addBank}
          />
        </div>

        {banks.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No banks added yet. Use "Add Bank" above to start entering this
              month's statement items.
            </CardContent>
          </Card>
        )}

        {banks.map((bank) => (
          <BankCard
            key={bank.id}
            bank={bank}
            onChange={updateBank}
            onRemove={() => removeBank(bank.id)}
          />
        ))}

        <CashCard rows={cashRows} onChange={setCashRows} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {banks.map((bank) => (
              <div
                key={bank.id}
                className="flex items-center justify-between text-sm"
              >
                <span className={paletteFor(bank.colorIndex).heading}>
                  {bank.bankName}
                </span>
                <span>
                  {formatCurrency(
                    bank.transactions.reduce((s, r) => s + r.amount, 0),
                  )}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm">
              <span className={CASH_PALETTE.heading}>Cash (net)</span>
              <span>{formatCurrency(cashNet)}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Grand Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default App
