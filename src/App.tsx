import { useEffect, useMemo, useRef, useState } from 'react'
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
import { PasskeyManager } from '@/components/PasskeyManager'
import { ScrollToTopButton } from '@/components/ScrollToTopButton'
import { formatCurrency, formatMonthLabel } from '@/lib/format'
import { paletteFor, CASH_PALETTE } from '@/lib/palette'
import { createEmptyRecap, createTransactionRow, isRowEmpty } from '@/lib/rows'
import { collectItemSuggestions, ITEM_SUGGESTIONS_LIST_ID } from '@/lib/itemSuggestions'
import { ApiError, fetchRecaps, getStatus, logout, saveRecap } from '@/lib/api'
import type { AuthStatus } from '@/lib/api'
import { RecapSaveQueue, type SaveState } from '@/lib/recapSaveQueue'
import { RequestGeneration } from '@/lib/requestGeneration'
import type { BankBlock, CashRow, MonthRecap, RecapsByMonth } from '@/lib/types'

function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

type AuthPhase = 'loading' | 'setup' | 'login' | 'ready' | 'unavailable'

function App() {
  const [authPhase, setAuthPhase] = useState<AuthPhase>('loading')
  const [status, setStatus] = useState<AuthStatus | null>(null)

  async function refreshStatus() {
    setAuthPhase('loading')
    try {
      const s = await getStatus()
      setStatus(s)
      setAuthPhase(s.needsSetup ? 'setup' : s.authenticated ? 'ready' : 'login')
    } catch {
      setAuthPhase('unavailable')
    }
  }

  // The queue is deliberately read at cleanup time because recap loading is asynchronous.
  // oxlint-disable react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false
    void getStatus()
      .then((s) => {
        if (cancelled) return
        setStatus(s)
        setAuthPhase(s.needsSetup ? 'setup' : s.authenticated ? 'ready' : 'login')
      })
      .catch(() => {
        if (!cancelled) setAuthPhase('unavailable')
      })
    return () => {
      cancelled = true
    }
  }, [])
  // oxlint-enable react-hooks/exhaustive-deps

  if (authPhase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading...
      </div>
    )
  }

  if (authPhase === 'unavailable') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-destructive">
          The server or database is unavailable. No data can be loaded safely.
        </p>
        <Button variant="outline" onClick={() => void refreshStatus()}>
          Retry connection
        </Button>
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
      initialPasskeyCount={status?.passkeyCount ?? 0}
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
  initialPasskeyCount,
  onLock,
}: {
  initialPasswordEnabled: boolean
  initialPasskeyCount: number
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
  const [loadPhase, setLoadPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [sessionExpired, setSessionExpired] = useState(false)
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})
  const [exporting, setExporting] = useState(false)
  const saveQueue = useRef<RecapSaveQueue | null>(null)
  const loadGeneration = useRef(new RequestGeneration())
  const loadAbort = useRef<AbortController | null>(null)
  const recapsRef = useRef<RecapsByMonth>({})
  // Briefly shown while switching months, purely for visual feedback -
  // the target month's data is already in memory, but a beat of spinner
  // followed by the layout sliding in reads better than an instant,
  // jarring swap.
  const [monthTransitioning, setMonthTransitioning] = useState(false)
  // Set right after a bank is added so its card can scroll itself into
  // view instead of leaving the user to scroll down and find it.
  const [justAddedBankId, setJustAddedBankId] = useState<string | null>(null)

  async function loadRecaps() {
    loadAbort.current?.abort()
    const abortController = new AbortController()
    loadAbort.current = abortController
    const generation = loadGeneration.current.begin()
    if (generation < 0) return
    setLoadPhase('loading')
    try {
      const stored = await fetchRecaps(abortController.signal)
      if (!loadGeneration.current.isCurrent(generation)) return
      saveQueue.current?.dispose()
      saveQueue.current = new RecapSaveQueue(saveRecap, stored.revisions, {
        onState: (changedMonth, state) =>
          setSaveStates((previous) => ({ ...previous, [changedMonth]: state })),
        onUnauthorized: () => setSessionExpired(true),
        onConflict: (changedMonth) =>
          toast.error(`${formatMonthLabel(changedMonth)} changed in another session. Reload the server copy to continue.`, {
            id: `conflict-${changedMonth}`,
            duration: Infinity,
          }),
      })
      recapsRef.current = stored.recaps
      setRecaps(stored.recaps)
      setSaveStates({})
      setLoadPhase('ready')
    } catch (error) {
      if (!loadGeneration.current.isCurrent(generation)) return
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (error instanceof ApiError && error.status === 401) {
        setSessionExpired(true)
      } else {
        setLoadPhase('error')
      }
    }
  }

  useEffect(() => {
    void loadRecaps()
    return () => {
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      loadGeneration.current.dispose()
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      loadAbort.current?.abort()
      // The queue is installed asynchronously by the initial load.
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      saveQueue.current?.dispose()
    }
    // The initial load owns the queue lifetime; retries call loadRecaps explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    const next = updater(recapsRef.current[month] ?? createEmptyRecap())
    recapsRef.current = { ...recapsRef.current, [month]: next }
    setRecaps(recapsRef.current)
    saveQueue.current?.enqueue(month, next)
  }

  function handleMonthChange(nextMonth: string) {
    setMonthTransitioning(true)
    setMonth(nextMonth)
    if (!recapsRef.current[nextMonth]) {
      recapsRef.current = { ...recapsRef.current, [nextMonth]: createEmptyRecap() }
      setRecaps(recapsRef.current)
    }
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
    const bank = banks.find((candidate) => candidate.id === id)
    if (bank?.transactions.some((row) => !isRowEmpty(row))) {
      const confirmed = window.confirm(
        `Remove ${bank.bankName} and all of its entered transactions?`,
      )
      if (!confirmed) return
    }
    updateRecap((r) => ({ ...r, banks: r.banks.filter((b) => b.id !== id) }))
  }

  function setCashRows(nextCashRows: CashRow[]) {
    updateRecap((r) => ({ ...r, cashRows: nextCashRows }))
  }

  async function handleExport() {
    setExporting(true)
    try {
      const { buildRecapPdf, recapPdfFilename } = await import('@/lib/pdf')
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
          // Cancellation is expected; other failures fall through to download.
          if (err instanceof Error && err.name === 'AbortError') return
        }
      }

      doc.save(filename)
    } catch {
      toast.error('Could not create the PDF export.')
    } finally {
      setExporting(false)
    }
  }

  if (sessionExpired) {
    return (
      <LoginScreen
        mode="unlock"
        passwordEnabled={passwordEnabled}
        passkeyCount={initialPasskeyCount}
        notice="Your session expired. Your unsaved edits are still in this browser; sign in to retry saving them."
        onSignedIn={() => {
          setSessionExpired(false)
          if (saveQueue.current) saveQueue.current.resume()
          else void loadRecaps()
        }}
      />
    )
  }

  if (loadPhase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading recaps...
      </div>
    )
  }

  if (loadPhase === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-destructive">
          Recaps could not be loaded. Editing is disabled so existing server data cannot be overwritten.
        </p>
        <Button variant="outline" onClick={() => void loadRecaps()}>
          Retry loading
        </Button>
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
              <Button onClick={() => void handleExport()} disabled={exporting}>
                {exporting ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
                <span className="hidden sm:inline">Share PDF</span>
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
            <p className="text-right text-xs text-muted-foreground" role="status">
              {saveStates[month] === 'saving' && 'Saving...'}
              {saveStates[month] === 'saved' && 'Saved'}
              {saveStates[month] === 'unsaved' && 'Unsaved changes'}
              {saveStates[month] === 'offline' && 'Offline - changes kept in this browser'}
              {saveStates[month] === 'conflict' && (
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs text-destructive"
                  onClick={() => {
                    if (window.confirm('Discard local changes and reload the latest server copy?')) {
                      void loadRecaps()
                    }
                  }}
                >
                  Conflict - reload server copy
                </Button>
              )}
            </p>
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
              <p className="text-sm font-medium">Add a bank statement</p>
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
