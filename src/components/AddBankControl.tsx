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
  const [selected, setSelected] = useState<string>('')
  const [customName, setCustomName] = useState('')

  const availablePresets = BANK_PRESETS.filter(
    (name) => name === 'Other' || !existingNames.includes(name),
  )

  const isOther = selected === 'Other'
  const trimmedCustom = customName.trim()
  const canAdd = isOther ? trimmedCustom.length > 0 : selected.length > 0

  function handleAdd() {
    if (!canAdd) return
    const name = isOther ? trimmedCustom : selected
    onAdd(name)
    setSelected('')
    setCustomName('')
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={selected} onValueChange={(value) => setSelected(value ?? '')}>
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
      {isOther && (
        <Input
          className="w-44"
          placeholder="Bank name"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
        />
      )}
      <Button size="sm" disabled={!canAdd} onClick={handleAdd} aria-label="Add Bank">
        <Plus className="size-4" />
        <span className="hidden sm:inline">Add Bank</span>
      </Button>
    </div>
  )
}
