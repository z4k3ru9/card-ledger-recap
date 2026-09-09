import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Fingerprint, Loader2, ShieldAlert, ShieldOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ApiError,
  deletePasskey,
  listPasskeys,
  revokePassword,
  type PasskeyInfo,
} from '@/lib/api'
import { isPasskeySupported, PasskeyError, registerPasskey } from '@/lib/webauthn'

interface PasskeyManagerProps {
  passwordEnabled: boolean
  onPasswordRevoked: () => void
}

export function PasskeyManager({
  passwordEnabled,
  onPasswordRevoked,
}: PasskeyManagerProps) {
  const [open, setOpen] = useState(false)
  const [passkeys, setPasskeys] = useState<PasskeyInfo[] | null>(null)
  const [label, setLabel] = useState('')
  const [registering, setRegistering] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    listPasskeys()
      .then(setPasskeys)
      .catch(() => setError('Could not load registered passkeys.'))
  }, [open])

  async function handleRegister() {
    setError(null)
    setRegistering(true)
    try {
      await registerPasskey(label.trim())
      setLabel('')
      toast.success('Passkey registered')
      setPasskeys(await listPasskeys())
    } catch (err) {
      setError(
        err instanceof PasskeyError || err instanceof ApiError
          ? err.message
          : 'Could not register a passkey on this device.',
      )
    } finally {
      setRegistering(false)
    }
  }

  async function handleDelete(id: string) {
    const passkey = passkeys?.find((candidate) => candidate.id === id)
    const confirmed = window.confirm(
      `Remove the passkey${passkey?.label ? ` “${passkey.label}”` : ''}? You will no longer be able to sign in with it.`,
    )
    if (!confirmed) return
    setError(null)
    try {
      await deletePasskey(id)
      setPasskeys(await listPasskeys())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove that passkey.')
    }
  }

  async function handleRevokePassword() {
    const confirmed = window.confirm(
      'Revoke the shared password? After this, passkeys are the ONLY way to sign in - ' +
        'anyone without a registered passkey (and without direct database access) will be ' +
        'permanently locked out. This cannot be undone from within the app. Continue?',
    )
    if (!confirmed) return

    setError(null)
    setRevoking(true)
    try {
      await revokePassword()
      toast.success('Password revoked - passkeys are now the only way to sign in')
      onPasswordRevoked()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke the password.')
    } finally {
      setRevoking(false)
    }
  }

  const hasPasskeys = (passkeys?.length ?? 0) > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) setError(null)
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label="Manage passkeys"
            title="Manage passkeys"
          />
        }
      >
        <Fingerprint className="size-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Passkeys</DialogTitle>
          <DialogDescription>
            Register a passkey to sign in without typing the shared password
            - anyone can add their own device here.
          </DialogDescription>
        </DialogHeader>

        {!isPasskeySupported() && (
          <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            This browser does not support passkeys, so one can't be
            registered from here.
          </p>
        )}

        {isPasskeySupported() && (
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="passkey-label">This device's name (optional)</Label>
              <Input
                id="passkey-label"
                placeholder="e.g. My iPhone"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={100}
              />
            </div>
            <Button onClick={handleRegister} disabled={registering}>
              {registering ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Fingerprint className="size-4" />
              )}
              Add
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {passkeys === null && (
            <p className="text-xs text-muted-foreground">Loading passkeys...</p>
          )}
          {passkeys?.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No passkeys registered yet.
            </p>
          )}
          {passkeys?.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{p.label || 'Unnamed passkey'}</p>
                <p className="text-xs text-muted-foreground">
                  Added {new Date(p.created_at).toLocaleDateString()}
                  {p.last_used_at &&
                    ` - last used ${new Date(p.last_used_at).toLocaleDateString()}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(p.id)}
                aria-label={`Remove passkey ${p.label ?? p.id}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="rounded-lg border border-dashed p-3">
          {passwordEnabled ? (
            <>
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" />
                Passkey-only login
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Once at least one passkey works, you can revoke the shared
                password so passkeys are the only way in. This is
                irreversible from the app - make sure a passkey actually
                signs you in first.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-2"
                disabled={!hasPasskeys || revoking}
                onClick={handleRevokePassword}
              >
                {revoking ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShieldOff className="size-4" />
                )}
                Revoke the password
              </Button>
            </>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShieldOff className="size-4" />
              The password is revoked - passkeys are the only way to sign in.
            </p>
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
