import { useEffect, useMemo, useState } from 'react'
import { Loader2, LogOut, CreditCard, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AddBankControl } from '@/components/AddBankControl'
import { BankCard } from '@/components/BankCard'
import { CashCard } from '@/components/CashCard'
import { LoginScreen } from '@/components/LoginScreen'
import { PasskeyManager } from '@/components/PasskeyManager'
import { ScrollToTopButton } from '@/components/ScrollToTopButton'
import { formatCurrency, formatMonthLabel } from '@/lib/format'
import { paletteFor, CASH_PALETTE } from '@/lib/palette'
import { buildRecapPdf, recapPdfFilename } from '@/lib/pdf'
import { createEmptyRecap, createTransactionRow } from '@/lib/rows'
import { collectItemSuggestions, ITEM_SUGGESTIONS_LIST_ID } from '@/lib/itemSuggestions'
import { fetchRecaps, getStatus, logout } from '@/lib/api'
import type { AuthStatus } from '@/lib/api'
import type { BankBlock, CashRow, MonthRecap, RecapsByMonth } from '@/lib/types'
import { useRecapAutosave } from '@/lib/useRecapAutosave'

function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

type AuthPhase = 'loading' | 'setup' | 'login' | 'ready'

function App() {
  const [authPhase, setAuthPhase] = useState<AuthPhase>('loading')
  const [status, setStatus] = useState<AuthStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const s = await getStatus()
        if (cancelled) return
        setStatus(s)
        setAuthPhase(s.needsSetup ? 'setup' : s.authenticated ? 'ready' : 'login')
      } catch {
        if (!cancelled) setAuthPhase('login')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (authPhase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading...
      </div>
    )
  }

  if (authPhase === 'setup' || authPhase === 'login') {
    return (
      <LoginScreen
        mode={authPhase === 'setup' ? 'setup' : 'unlock'}
        passwordEnabled={status?.passwordEnabled ?? true}
        passkeyCount={status?.passkeyCount ?? 0}
        onSignedIn={() => setAuthPhase('ready')}
      />
    )
  }

  return (
    <RecapApp
      initialPasswordEnabled={status?.passwordEnabled ?? true}
      onLock={async () => {
        await logout().catch(() => {})
        // Re-fetch rather than trusting the stale status from initial
        // load - a passkey may have been registered (or the password
        // revoked) since then, and the login screen needs that to decide
        // what to show.
        try {
          setStatus(await getStatus())
        } catch {
          // Keep the previous status if this fails; login.php/webauthn
          // endpoints still enforce the real rules either way.
        }
        setAuthPhase('login')
      }}
    />
  )
}

function RecapApp({
  initialPasswordEnabled,
  onLock,
}: {
  initialPasswordEnabled: boolean
  onLock: () => void
}) {
  const [passwordEnabled, setPasswordEnabled] = useState(initialPasswordEnabled)
  const [month, setMonth] = useState(currentMonthValue())
  // Every month gets its own recap automatically - switching the month
  // picker below loads that month's banks/cash (creating a blank one on
  // first visit) instead of sharing one pool of data across all months.
  // The whole set is fetched once from the shared MySQL database; edits
  // are then saved back one month at a time (see the debounced effect
  // below), not as one giant blob.
  const [recaps, setRecaps] = useState<RecapsByMonth>({})
  const [loaded, setLoaded] = useState(false)
  // Briefly shown while switching months, purely for visual feedback -
  // the target month's data is already in memory, but a beat of spinner
  // followed by the layout sliding in reads better than an instant,
  // jarring swap.
  const [monthTransitioning, setMonthTransitioning] = useState(false)
  // Set right after a bank is added so its card can scroll itself into
  // view instead of leaving the user to scroll down and find it.
  const [justAddedBankId, setJustAddedBankId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const stored = await fetchRecaps().catch(() => ({}) as RecapsByMonth)
      if (!cancelled) {
        setRecaps(stored)
        setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const recap: MonthRecap = recaps[month] ?? createEmptyRecap()
  const { banks, cashRows } = recap
  const { flush: flushAutosave } = useRecapAutosave(
    month,
    recaps[month],
    loaded,
  )

  // Every distinct "Item" ever entered (any bank, any month already
  // loaded), most-used first - backs the datalist every description
  // input points at, so repeated items autocomplete as you type.
  const itemSuggestions = useMemo(() => collectItemSuggestions(recaps), [recaps])

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
    flushAutosave()
    setMonthTransitioning(true)
    setMonth(nextMonth)
    setRecaps((prev) =>
      prev[nextMonth] ? prev : { ...prev, [nextMonth]: createEmptyRecap() },
    )
    window.setTimeout(() => setMonthTransitioning(false), 300)
  }

  function addBank(bankName: string) {
    const newBankId = crypto.randomUUID()
    updateRecap((r) => ({
      ...r,
      banks: [
        ...r.banks,
        {
          id: newBankId,
          bankName,
          colorIndex: r.banks.length,
          transactions: [createTransactionRow()],
        },
      ],
    }))
    setJustAddedBankId(newBankId)
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
    const doc = buildRecapPdf({ month, banks, cashRows })
    const filename = recapPdfFilename(month)
    doc.save(filename)
  }

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading recaps...
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <datalist id={ITEM_SUGGESTIONS_LIST_ID}>
        {itemSuggestions.map((description) => (
          <option key={description} value={description} />
        ))}
      </datalist>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center bg-primary text-primary-foreground">
              <CreditCard className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Statement notes
              </p>
              <h1 className="text-xl font-semibold tracking-tight">
                Monthly recap
              </h1>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="month" className="sr-only">
              Recap month
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="month"
                type="month"
                className="w-44 shrink-0"
                value={month}
                onChange={(e) => handleMonthChange(e.target.value)}
              />
              <Button onClick={handleExport}>
                <Download className="size-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
              <PasskeyManager
                passwordEnabled={passwordEnabled}
                onPasswordRevoked={() => setPasswordEnabled(false)}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={onLock}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {monthTransitioning ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading {formatMonthLabel(month)}...
          </div>
        ) : (
          <main
            key={month}
            className="flex animate-in flex-col gap-6 fade-in-0 slide-in-from-top-4 duration-300"
          >
            <section className="grid gap-5 border-y py-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
                  {formatMonthLabel(month)}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  Enter statement items
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add each line from your statement. Totals update as you type.
                </p>
              </div>
              <AddBankControl
                existingNames={banks.map((b) => b.bankName)}
                onAdd={addBank}
              />
            </section>

            {banks.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No banks added yet for {formatMonthLabel(month)}. Use "Add
                  Bank" above to start entering this month's statement items.
                </CardContent>
              </Card>
            )}

            {banks.map((bank) => (
              <BankCard
                key={bank.id}
                bank={bank}
                onChange={updateBank}
                onRemove={() => removeBank(bank.id)}
                justAdded={bank.id === justAddedBankId}
                onFocused={() => setJustAddedBankId(null)}
              />
            ))}

            <CashCard rows={cashRows} onChange={setCashRows} />

            <Card className="border-primary/20 bg-primary/[0.03]">
              <CardHeader>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Recap total
                    </p>
                    <CardTitle className="mt-1 text-3xl tabular-nums">
                      {formatCurrency(grandTotal)}
                    </CardTitle>
                  </div>
                  <p className="max-w-40 text-right text-xs text-muted-foreground">
                    {banks.length} {banks.length === 1 ? 'bank' : 'banks'} · {formatMonthLabel(month)}
                  </p>
                </div>
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
        )}
      </div>
      <ScrollToTopButton />
    </div>
  )
}

export default App
