import { useEffect, useState, type FormEvent } from 'react'
import { CreditCard, Fingerprint, Loader2, Lock } from 'lucide-react'
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
import {
  hasPasskeyWorkedOnThisDevice,
  isPasskeySupported,
  loginWithPasskey,
  loginWithPasskeyConditional,
  PasskeyError,
} from '@/lib/webauthn'

interface LoginScreenProps {
  /** "setup" the first time (no shared password yet), "unlock" every time after. */
  mode: 'setup' | 'unlock'
  passwordEnabled: boolean
  passkeyCount: number
  onSignedIn: () => void
}

export function LoginScreen({
  mode,
  passwordEnabled,
  passkeyCount,
  onSignedIn,
}: LoginScreenProps) {
  const canUsePasskey =
    mode === 'unlock' && passkeyCount > 0 && isPasskeySupported()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [passkeyBusy, setPasskeyBusy] = useState(false)

  // On page load, try a passkey automatically - but how "loud" depends
  // on whether this device has ever actually completed a passkey
  // sign-in before (a plain localStorage flag, not security-sensitive):
  //   - known-good device: fire the real native prompt right away (Face
  //     ID / Touch ID / Windows Hello / a picker) with no click needed -
  //     this device has a real reason to expect one to be there.
  //   - unknown/new device: stay quiet and only offer the passkey as a
  //     suggestion in the password field's own autofill dropdown (see
  //     its `autocomplete` value below) once the user clicks into it -
  //     an unprompted "no passkey found" dialog on a device that's never
  //     used one here would just be annoying.
  // Either way, the explicit button and plain password entry still work.
  useEffect(() => {
    if (!canUsePasskey) return
    const controller = new AbortController()
    const autoPrompt = hasPasskeyWorkedOnThisDevice()

    if (autoPrompt) setPasskeyBusy(true)
    ;(autoPrompt
      ? loginWithPasskey(controller.signal)
      : loginWithPasskeyConditional(controller.signal)
    )
      .then(() => {
        if (!controller.signal.aborted) onSignedIn()
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        // Only the loud, known-good-device path has anything worth
        // surfacing - a declined/failed background suggestion on an
        // unknown device should just stay silent (the button is right there).
        if (autoPrompt && err instanceof PasskeyError) {
          setError(err.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setPasskeyBusy(false)
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUsePasskey])

  async function handlePasskeyLogin() {
    setError(null)
    setPasskeyBusy(true)
    try {
      await loginWithPasskey()
      onSignedIn()
    } catch (err) {
      setError(
        err instanceof PasskeyError ? err.message : 'Passkey sign-in failed.',
      )
    } finally {
      setPasskeyBusy(false)
    }
  }

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

  const showPasswordFields = mode === 'setup' || passwordEnabled
  const noWayIn = mode === 'unlock' && !canUsePasskey && !passwordEnabled

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-2 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CreditCard className="size-5" />
          </div>
          <CardTitle>
            {mode === 'setup'
              ? 'Set the app password'
              : canUsePasskey
                ? 'Sign in'
                : 'Enter the app password'}
          </CardTitle>
          <CardDescription>
            {mode === 'setup'
              ? 'This recap is shared - anyone with this password can view and edit it, stored centrally in the database, not just on this device.'
              : 'Recap data is stored centrally and shared by everyone with access.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canUsePasskey && (
            <Button onClick={handlePasskeyLogin} disabled={passkeyBusy}>
              {passkeyBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Fingerprint className="size-4" />
              )}
              Sign in with a passkey
            </Button>
          )}

          {showPasswordFields && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoFocus
                  // The "webauthn" token is what lets a supporting browser
                  // offer a registered passkey right in this field's own
                  // autofill dropdown, alongside any saved password - see
                  // the conditional-UI effect above.
                  autoComplete={
                    mode === 'setup'
                      ? 'new-password'
                      : 'current-password webauthn'
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
              <Button type="submit" disabled={busy || !password}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Lock className="size-4" />
                )}
                {mode === 'setup' ? 'Create password' : 'Sign in'}
              </Button>
            </form>
          )}

          {noWayIn && (
            <p className="text-sm text-destructive">
              Password login is disabled and no passkey is available here -{' '}
              {isPasskeySupported()
                ? 'no passkey is registered for this account.'
                : 'this browser does not support passkeys.'}{' '}
              Try a device/browser with the registered passkey, or see the
              README for how an admin can restore password access directly
              in the database.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {mode === 'unlock' && passwordEnabled && (
            <p className="text-center text-xs text-muted-foreground">
              Forgot the password? An admin can reset it directly in the
              database (the <code>auth</code> table).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
