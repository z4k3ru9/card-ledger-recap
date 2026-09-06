import { useEffect, useState } from 'react'
import { FileDown, Loader2, LogOut, ShieldAlert, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AddBankControl } from '@/components/AddBankControl'
import { BankCard } from '@/components/BankCard'
import { CashCard } from '@/components/CashCard'
import { LoginScreen } from '@/components/LoginScreen'
import { ThemeToggle } from '@/components/ThemeToggle'
import { formatCurrency, formatMonthLabel } from '@/lib/format'
import { paletteFor, CASH_PALETTE } from '@/lib/palette'
import { generateRecapPdf } from '@/lib/pdf'
import { createEmptyRecap, createTransactionRow } from '@/lib/rows'
import { loadRecaps, saveRecaps } from '@/lib/storage'
import { hasVault, resetVault } from '@/lib/vault'
import type { BankBlock, CashRow, MonthRecap, RecapsByMonth } from '@/lib/types'

function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// The login/encryption feature needs the Web Crypto API, which browsers
// only expose in a "secure context" - HTTPS (or localhost). Deployed on
// plain HTTP (common on a fresh cPanel domain before SSL is issued),
// `crypto.subtle` is simply undefined, so this app is unusable there.
// Fail with a clear, actionable message instead of crashing silently.
function isSecureContext(): boolean {
  return typeof window !== 'undefined' && Boolean(window.isSecureContext)
}

function InsecureContextNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-2 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <ShieldAlert className="size-5" />
          </div>
          <CardTitle>HTTPS required</CardTitle>
          <CardDescription>
            This app encrypts your data locally using your browser's Web
            Crypto API, which is only available over a secure connection.
            Serve this site over HTTPS (most hosts, including cPanel, offer
            a free SSL certificate you can enable) and reload this page.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

function App() {
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null)
  // Whether a password has been set up at all - tracked separately from
  // cryptoKey so that locking (cryptoKey -> null) goes back to "unlock",
  // not "setup", once a vault already exists.
  const [vaultExists, setVaultExists] = useState(hasVault)

  if (!isSecureContext()) {
    return <InsecureContextNotice />
  }

  if (!cryptoKey) {
    return (
      <LoginScreen
        mode={vaultExists ? 'unlock' : 'setup'}
        onUnlocked={(key) => {
          setVaultExists(true)
          setCryptoKey(key)
        }}
        onReset={() => {
          resetVault()
          setVaultExists(false)
        }}
      />
    )
  }

  return (
    <RecapApp cryptoKey={cryptoKey} onLock={() => setCryptoKey(null)} />
  )
}

function RecapApp({
  cryptoKey,
  onLock,
}: {
  cryptoKey: CryptoKey
  onLock: () => void
}) {
  const [month, setMonth] = useState(currentMonthValue())
  // Every month gets its own recap automatically - switching the month
  // picker below loads that month's banks/cash (creating a blank one on
  // first visit) instead of sharing one pool of data across all months.
  const [recaps, setRecaps] = useState<RecapsByMonth>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const stored = await loadRecaps(cryptoKey)
      const withInitial = stored[month]
        ? stored
        : { ...stored, [month]: createEmptyRecap() }
      if (!cancelled) {
        setRecaps(withInitial)
        setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
    // Only runs once, right after unlocking - `month` here is just the
    // initial value from useState above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cryptoKey])

  useEffect(() => {
    if (!loaded) return
    saveRecaps(cryptoKey, recaps)
  }, [cryptoKey, recaps, loaded])

  const recap: MonthRecap = recaps[month] ?? createEmptyRecap()
  const { banks, cashRows } = recap

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

  function updateRecap(updater: (recap: MonthRecap) => MonthRecap) {
    setRecaps((prev) => ({
      ...prev,
      [month]: updater(prev[month] ?? createEmptyRecap()),
    }))
  }

  function handleMonthChange(nextMonth: string) {
    setMonth(nextMonth)
    setRecaps((prev) =>
      prev[nextMonth] ? prev : { ...prev, [nextMonth]: createEmptyRecap() },
    )
  }

  function addBank(bankName: string) {
    updateRecap((r) => ({
      ...r,
      banks: [
        ...r.banks,
        {
          id: crypto.randomUUID(),
          bankName,
          colorIndex: r.banks.length,
          transactions: [createTransactionRow()],
        },
      ],
    }))
  }

  function updateBank(updated: BankBlock) {
    updateRecap((r) => ({
      ...r,
      banks: r.banks.map((b) => (b.id === updated.id ? updated : b)),
    }))
  }

  function removeBank(id: string) {
    updateRecap((r) => ({ ...r, banks: r.banks.filter((b) => b.id !== id) }))
  }

  function setCashRows(nextCashRows: CashRow[]) {
    updateRecap((r) => ({ ...r, cashRows: nextCashRows }))
  }

  function handleExport() {
    generateRecapPdf({ month, banks, cashRows })
  }

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Decrypting your data...
      </div>
    )
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
              onChange={(e) => handleMonthChange(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExport}>
              <FileDown className="size-4" />
              Export PDF
            </Button>
            <ThemeToggle />
            <Button
              variant="outline"
              size="icon"
              onClick={onLock}
              aria-label="Lock"
              title="Lock"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mt-6 flex flex-col gap-6">
        <p className="text-xs text-muted-foreground">
          Each month is its own recap and is saved automatically, encrypted,
          in this browser - switch the month above any time to start or
          continue a different one.
        </p>

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
              No banks added yet for {formatMonthLabel(month)}. Use "Add Bank"
              above to start entering this month's statement items.
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
