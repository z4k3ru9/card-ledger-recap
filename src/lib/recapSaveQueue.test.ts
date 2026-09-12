import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import { RecapSaveQueue, type SaveState } from './recapSaveQueue'
import type { MonthRecap } from './types'

const recap = (amount: number): MonthRecap => ({
  banks: [],
  cashRows: [{ id: `row-${amount}`, date: '', type: 'debit', description: '', amount }],
})

function events() {
  const states: SaveState[] = []
  return {
    states,
    callbacks: {
      onState: (_month: string, state: SaveState) => states.push(state),
      onUnauthorized: vi.fn(),
      onConflict: vi.fn(),
    },
  }
}

describe('RecapSaveQueue', () => {
  it('serializes writes and passes the returned revision to the next save', async () => {
    vi.useFakeTimers()
    const resolvers: ((revision: number) => void)[] = []
    const save = vi.fn(
      (_month: string, _recap: MonthRecap, _revision: number) =>
        new Promise<number>((resolve) => resolvers.push(resolve)),
    )
    const tracked = events()
    const queue = new RecapSaveQueue(save, {}, tracked.callbacks, 10)

    queue.enqueue('2026-09', recap(1))
    await vi.advanceTimersByTimeAsync(10)
    queue.enqueue('2026-09', recap(2))
    expect(save).toHaveBeenCalledTimes(1)

    resolvers[0](1)
    await Promise.resolve()
    await vi.runAllTimersAsync()
    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls[1][2]).toBe(1)
    expect(save.mock.calls[1][1]).toEqual(recap(2))
    queue.dispose()
    vi.useRealTimers()
  })

  it('retains an unauthorized write and retries it after authentication', async () => {
    vi.useFakeTimers()
    const save = vi
      .fn<(_month: string, _recap: MonthRecap, _revision: number) => Promise<number>>()
      .mockRejectedValueOnce(new ApiError('expired', 401))
      .mockResolvedValueOnce(4)
    const tracked = events()
    const queue = new RecapSaveQueue(save, { '2026-09': 3 }, tracked.callbacks, 10)

    queue.enqueue('2026-09', recap(7))
    await vi.runAllTimersAsync()
    expect(tracked.callbacks.onUnauthorized).toHaveBeenCalledOnce()
    queue.resume()
    await vi.runAllTimersAsync()

    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls[1][2]).toBe(3)
    expect(tracked.states.at(-1)).toBe('saved')
    queue.dispose()
    vi.useRealTimers()
  })

  it('blocks subsequent writes after a conflict', async () => {
    vi.useFakeTimers()
    const save = vi
      .fn<(_month: string, _recap: MonthRecap, _revision: number) => Promise<number>>()
      .mockRejectedValue(new ApiError('conflict', 409, 'recap_conflict'))
    const tracked = events()
    const queue = new RecapSaveQueue(save, { '2026-09': 2 }, tracked.callbacks, 10)

    queue.enqueue('2026-09', recap(1))
    await vi.runAllTimersAsync()
    queue.enqueue('2026-09', recap(2))
    await vi.runAllTimersAsync()

    expect(save).toHaveBeenCalledOnce()
    expect(tracked.callbacks.onConflict).toHaveBeenCalledWith('2026-09')
    expect(tracked.states.at(-1)).toBe('conflict')
    queue.dispose()
    vi.useRealTimers()
  })
})
