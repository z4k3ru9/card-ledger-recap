import { describe, expect, it } from 'vitest'
import { RequestGeneration } from './requestGeneration'

describe('RequestGeneration', () => {
  it('invalidates older loads when a newer load begins', () => {
    const guard = new RequestGeneration()
    const first = guard.begin()
    const second = guard.begin()
    expect(guard.isCurrent(first)).toBe(false)
    expect(guard.isCurrent(second)).toBe(true)
  })

  it('invalidates all completions after disposal', () => {
    const guard = new RequestGeneration()
    const generation = guard.begin()
    guard.dispose()
    expect(guard.isCurrent(generation)).toBe(false)
    expect(guard.begin()).toBe(-1)
  })
})
