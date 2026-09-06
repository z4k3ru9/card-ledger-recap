import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, LogOut, CreditCard, Share2 } from 'lucide-react'
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
import { ScrollToTopButton } from '@/components/ScrollToTopButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { formatCurrency, formatMonthLabel } from '@/lib/format'
import { paletteFor, CASH_PALETTE } from '@/lib/palette'
import { buildRecapPdf, recapPdfFilename } from '@/lib/pdf'
import { createEmptyRecap, createTransactionRow } from '@/lib/rows'
import { collectItemSuggestions, ITEM_SUGGESTIONS_LIST_ID } from '@/lib/itemSuggestions'
import { fetchRecaps, getStatus, logout, saveRecap } from '@/lib/api'
import type { BankBlock, CashRow, MonthRecap, RecapsByMonth } from '@/lib/types'

function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

type AuthStatus = 'loading' | 'setup' | 'login' | 'ready'

function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const status = await getStatus()
        if (cancelled) return
        setAuthStatus(status.needsSetup ? 'setup' : status.authenticated ? 'ready' : 'login')
      } catch {
        if (!cancelled) setAuthStatus('login')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (authStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading...
      </div>
    )
  }

  if (authStatus === 'setup' || authStatus === 'login') {
    return (
      <LoginScreen
        mode={authStatus === 'setup' ? 'setup' : 'unlock'}
        onSignedIn={() => setAuthStatus('ready')}
      />
    )
  }

  return (
    <RecapApp
      onLock={() => {
        void logout()
        setAuthStatus('login')
      }}
    />
  )
}

function RecapApp({ onLock }: { onLock: () => void }) {
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

  // Debounced autosave of just the current month, so fast typing doesn't
  // fire a request per keystroke.
  useEffect(() => {
    if (!loaded) return
    const current = recaps[month]
    if (!current) return
    const timeout = setTimeout(() => {
      saveRecap(month, current)
        .then(() => {
          toast.success('Recap saved', { id: 'autosave' })
        })
        .catch(() => {
          // A transient failure just means this edit isn't saved yet -
          // the next change (or a page reload) will retry.
          toast.error('Failed to save - check your connection and try again', {
            id: 'autosave',
          })
        })
    }, 600)
    return () => clearTimeout(timeout)
  }, [recaps, month, loaded])

  const recap: MonthRecap = recaps[month] ?? createEmptyRecap()
  const { banks, cashRows } = recap

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

  async function handleExport() {
    const doc = buildRecapPdf({ month, banks, cashRows })
    const filename = recapPdfFilename(month)
    const blob = doc.output('blob')
    const file = new File([blob], filename, { type: 'application/pdf' })

    const canShareFile =
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })

    if (canShareFile) {
      try {
        await navigator.share({
          files: [file],
          title: filename,
          text: `Rekap ${formatMonthLabel(month)}`,
        })
        return
      } catch (err) {
        // The user cancelling the share sheet isn't an error - just do
        // nothing. Anything else (no share target available, etc.)
        // falls through to a plain download instead.
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }

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
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CreditCard className="size-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              Monthly Credit Card Usage Recap
            </h1>
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
                <Share2 className="size-4" />
                <span className="hidden sm:inline">Share PDF</span>
              </Button>
              <ThemeToggle />
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
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4">
              <div>
                <p className="text-sm font-medium">Add a bank statement</p>
                <p className="text-xs text-muted-foreground">
                  Pick a bank, then fill in each statement item manually
                  below.
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
        )}
      </div>
      <ScrollToTopButton />
    </div>
  )
}

export default App
