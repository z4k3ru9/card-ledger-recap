import { describe, expect, it } from 'vitest'
import { addMinorUnits, isMinorUnits, parseMinorUnits } from './money'

describe('minor-unit money', () => {
  it('accepts only bounded non-negative safe integers', () => {
    expect(isMinorUnits(125000)).toBe(true)
    expect(isMinorUnits(1.5)).toBe(false)
    expect(isMinorUnits(-1)).toBe(false)
    expect(isMinorUnits(Number.MAX_SAFE_INTEGER + 1)).toBe(false)
  })

  it('parses digit input without fractional or floating-point values', () => {
    expect(parseMinorUnits('1.250.000')).toBe(1250000)
    expect(parseMinorUnits('Rp 12,500')).toBe(12500)
    expect(parseMinorUnits('1'.repeat(20))).toBe(0)
    expect(parseMinorUnits('')).toBe(0)
  })

  it('adds integer values exactly', () => {
    expect(addMinorUnits([10, 20, 30])).toBe(60)
    expect(addMinorUnits([1000000000000, 1])).toBe(0)
  })
})
