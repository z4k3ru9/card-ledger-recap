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
import { ApiError, login, setupPassword } from '@/lib/api'

interface LoginScreenProps {
  /** "setup" the first time (no shared password yet), "unlock" every time after. */
  mode: 'setup' | 'unlock'
  onSignedIn: () => void
}

export function LoginScreen({ mode, onSignedIn }: LoginScreenProps) {
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
      if (mode === 'setup') {
        await setupPassword(password)
      } else {
        await login(password)
      }
      onSignedIn()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-2 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CreditCard className="size-5" />
          </div>
          <CardTitle>
            {mode === 'setup' ? 'Set the app password' : 'Enter the app password'}
          </CardTitle>
          <CardDescription>
            {mode === 'setup'
              ? 'This recap is shared - anyone with this password can view and edit it, stored centrally in the database, not just on this device.'
              : 'Recap data is stored centrally and shared by everyone with this password.'}
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
              {mode === 'setup' ? 'Create password' : 'Sign in'}
            </Button>
            {mode === 'unlock' && (
              <p className="text-center text-xs text-muted-foreground">
                Forgot the password? An admin can reset it directly in the
                database (the <code>auth</code> table).
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
