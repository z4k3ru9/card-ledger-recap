/**
 * Monetary values in the legacy recap are IDR minor units (whole rupiah).
 * Keeping this boundary integer-only avoids IEEE-754 rounding surprises while
 * preserving the existing JSON shape and API compatibility.
 */
export type MinorUnits = number

export const MAX_MINOR_UNITS = 1_000_000_000_000

export function isMinorUnits(value: number): value is MinorUnits {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_MINOR_UNITS
}

/** Parse the digit-only input used by AmountInput without accepting overflow. */
export function parseMinorUnits(input: string): MinorUnits {
  const digits = input.replace(/\D/g, '')
  if (!digits) return 0

  const value = Number(digits)
  return isMinorUnits(value) ? value : 0
}

export function addMinorUnits(values: readonly MinorUnits[]): MinorUnits {
  const total = values.reduce((sum, value) => sum + value, 0)
  // Individual values are bounded, but this protects callers from silently
  // producing an unsafe integer when aggregating an unexpectedly large list.
  return isMinorUnits(total) ? total : 0
}
