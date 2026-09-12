import { Input } from '@/components/ui/input'

interface AmountInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

// Displays the value with "." thousand separators (id-ID grouping) and
// keeps only digits as the user types, so the field always shows a
// readable number without needing to leave it first.
export function AmountInput({ value, onChange, className }: AmountInputProps) {
  const display = value === 0 ? '' : value.toLocaleString('id-ID')

  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="0"
      className={className}
      value={display}
      onChange={(e) => {
        const digitsOnly = e.target.value.replace(/\D/g, '')
        onChange(digitsOnly ? Number(digitsOnly) : 0)
      }}
    />
  )
}
