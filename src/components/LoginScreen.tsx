import { useState, type FormEvent } from 'react'
import { CreditCard, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createVault, unlockVault } from '@/lib/vault'

interface LoginScreenProps {
  /** "setup" the first time (no vault yet), "unlock" every time after. */
  mode: 'setup' | 'unlock'
  onUnlocked: (key: CryptoKey) => void
  onReset: () => void
}

export function LoginScreen({ mode, onUnlocked, onReset }: LoginScreenProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === 'setup') {
      if (password.length < 8) {
        setError('Use at least 8 characters.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    setBusy(true)
    try {
      const key =
        mode === 'setup'
          ? await createVault(password)
          : await unlockVault(password)
      if (!key) {
        setError('Incorrect password.')
        return
      }
      onUnlocked(key)
    } finally {
      setBusy(false)
    }
  }

  function handleReset() {
    const confirmed = window.confirm(
      'This permanently deletes all saved recaps on this device - they were encrypted with the old password and cannot be recovered. Continue?',
    )
    if (confirmed) onReset()
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-2 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CreditCard className="size-5" />
          </div>
          <CardTitle>
            {mode === 'setup' ? 'Set an app password' : 'Enter your password'}
          </CardTitle>
          <CardDescription>
            {mode === 'setup'
              ? 'Your recap data is encrypted on this device with this password. There is no recovery - if it is lost, the data cannot be decrypted.'
              : 'Your recap data is encrypted on this device and needs your password to unlock.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoFocus
                autoComplete={
                  mode === 'setup' ? 'new-password' : 'current-password'
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {mode === 'setup' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy || !password}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Lock className="size-4" />
              )}
              {mode === 'setup' ? 'Create password' : 'Unlock'}
            </Button>
            {mode === 'unlock' && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Forgot password? Reset app data
              </button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
