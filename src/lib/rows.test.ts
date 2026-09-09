import { describe, expect, it } from 'vitest'
import { isRowEmpty, withTrailingEmptyRow } from './rows'
import type { TransactionRow } from './types'

const row = (id: string, amount = 0): TransactionRow => ({
  id,
  date: '',
  description: '',
  amount,
})

describe('withTrailingEmptyRow', () => {
  it('keeps exactly one empty row after filled rows', () => {
    const result = withTrailingEmptyRow(
      [row('blank-a'), row('filled', 10), row('blank-b')],
      () => row('new'),
    )
    expect(result.map((item) => item.id)).toEqual(['filled', 'blank-b'])
    expect(result.filter(isRowEmpty)).toHaveLength(1)
  })

  it('creates a blank row when none remains', () => {
    expect(withTrailingEmptyRow([row('filled', 10)], () => row('new')).at(-1)?.id).toBe('new')
  })
})
