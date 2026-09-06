import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BANK_PRESETS } from '@/lib/banks'

interface AddBankControlProps {
  existingNames: string[]
  onAdd: (bankName: string) => void
}

export function AddBankControl({
  existingNames,
  onAdd,
}: AddBankControlProps) {
  // "Other" is the one case that still needs an explicit confirm step
  // (a name has to be typed first) - every preset bank adds itself the
  // moment it's picked, no separate button needed.
  const [pendingOther, setPendingOther] = useState(false)
  const [customName, setCustomName] = useState('')

  const availablePresets = BANK_PRESETS.filter(
    (name) => name === 'Other' || !existingNames.includes(name),
  )

  const trimmedCustom = customName.trim()

  function handleSelect(value: string | null) {
    if (!value) return
    if (value === 'Other') {
      setPendingOther(true)
      return
    }
    onAdd(value)
  }

  function handleAddCustom() {
    if (!trimmedCustom) return
    onAdd(trimmedCustom)
    setPendingOther(false)
    setCustomName('')
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value="" onValueChange={handleSelect}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Choose a bank" />
        </SelectTrigger>
        <SelectContent>
          {availablePresets.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pendingOther && (
        <>
          <Input
            className="w-44"
            autoFocus
            placeholder="Bank name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCustom()
            }}
          />
          <Button
            size="sm"
            disabled={!trimmedCustom}
            onClick={handleAddCustom}
            aria-label="Add Bank"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </>
      )}
    </div>
  )
}
