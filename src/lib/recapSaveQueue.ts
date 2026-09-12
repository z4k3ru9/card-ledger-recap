import { ApiError } from './api'
import type { MonthRecap } from './types'

export type SaveState = 'idle' | 'unsaved' | 'saving' | 'saved' | 'offline' | 'conflict'

type SaveAdapter = (
  month: string,
  recap: MonthRecap,
  expectedRevision: number,
) => Promise<number>

interface MonthQueue {
  revision: number
  pending?: MonthRecap
  timer?: ReturnType<typeof setTimeout>
  inFlight: boolean
  conflicted: boolean
  retryCount: number
  retryDelay?: number
  scheduleAfterDrain?: boolean
}

interface SaveQueueEvents {
  onState: (month: string, state: SaveState) => void
  onUnauthorized: () => void
  onConflict: (month: string) => void
  onRetryAvailable?: (month: string) => void
}

/**
 * Owns debounce, ordering, revisions, retries, and conflict blocking behind
 * one small interface. React only supplies immutable snapshots and renders
 * state changes; it never has to coordinate requests itself.
 */
export class RecapSaveQueue {
  private readonly months = new Map<string, MonthQueue>()
  private paused = false
  private readonly save: SaveAdapter
  private readonly events: SaveQueueEvents
  private readonly debounceMs: number
  private disposed = false
  private generation = 0
  private readonly maxRetries = 3

  constructor(
    save: SaveAdapter,
    revisions: Record<string, number>,
    events: SaveQueueEvents,
    debounceMs = 600,
  ) {
    this.save = save
    this.events = events
    this.debounceMs = debounceMs
    for (const [month, revision] of Object.entries(revisions)) {
      this.months.set(month, {
        revision,
        inFlight: false,
        conflicted: false,
        retryCount: 0,
      })
    }
  }

  enqueue(month: string, recap: MonthRecap): void {
    const queue = this.getMonth(month)
    queue.pending = recap
    if (queue.conflicted) {
      this.events.onState(month, 'conflict')
      return
    }
    this.events.onState(month, 'unsaved')
    this.schedule(month, queue)
  }

  /** Resume requests after the user has re-authenticated. */
  resume(): void {
    if (this.disposed) return
    this.paused = false
    for (const [month, queue] of this.months) {
      if (queue.pending && !queue.conflicted) this.schedule(month, queue, 0)
    }
  }

  dispose(): void {
    this.disposed = true
    this.generation += 1
    this.paused = true
    for (const queue of this.months.values()) {
      if (queue.timer) clearTimeout(queue.timer)
      queue.timer = undefined
    }
  }

  private getMonth(month: string): MonthQueue {
    let queue = this.months.get(month)
    if (!queue) {
      queue = { revision: 0, inFlight: false, conflicted: false, retryCount: 0 }
      this.months.set(month, queue)
    }
    return queue
  }

  private schedule(month: string, queue: MonthQueue, delay = this.debounceMs): void {
    if (this.disposed || this.paused || queue.inFlight || queue.conflicted) return
    if (queue.timer) clearTimeout(queue.timer)
    queue.timer = setTimeout(() => {
      queue.timer = undefined
      void this.drain(month, queue)
    }, delay)
  }

  private async drain(month: string, queue: MonthQueue): Promise<void> {
    if (this.disposed || this.paused || queue.inFlight || queue.conflicted || !queue.pending) return
    const snapshot = queue.pending
    queue.pending = undefined
    queue.inFlight = true
    const generation = this.generation
    this.events.onState(month, 'saving')

    try {
      queue.revision = await this.save(month, snapshot, queue.revision)
      if (this.disposed || generation !== this.generation) return
      queue.retryCount = 0
      queue.scheduleAfterDrain = true
      this.events.onState(month, queue.pending ? 'unsaved' : 'saved')
    } catch (error) {
      if (this.disposed || generation !== this.generation) return
      // Never replace a newer pending edit with the older failed snapshot.
      queue.pending ??= snapshot
      if (error instanceof ApiError && error.status === 401) {
        this.paused = true
        this.events.onState(month, 'offline')
        this.events.onUnauthorized()
      } else if (
        error instanceof ApiError &&
        (error.status === 409 || error.code === 'recap_conflict')
      ) {
        queue.conflicted = true
        this.events.onState(month, 'conflict')
        this.events.onConflict(month)
      } else {
        this.events.onState(month, 'offline')
        if (this.isRetryable(error) && queue.retryCount < this.maxRetries) {
          queue.retryCount += 1
          queue.retryDelay = this.retryDelay(queue.retryCount)
          queue.scheduleAfterDrain = true
        } else {
          queue.scheduleAfterDrain = false
          this.events.onRetryAvailable?.(month)
        }
      }
    } finally {
      queue.inFlight = false
      if (queue.pending && !this.disposed && !this.paused && !queue.conflicted && !queue.timer) {
        const delay = queue.retryDelay
        const shouldSchedule = queue.scheduleAfterDrain
        queue.retryDelay = undefined
        queue.scheduleAfterDrain = undefined
        if (shouldSchedule) this.schedule(month, queue, delay ?? 0)
      }
    }
  }

  retry(month: string): void {
    if (this.disposed) return
    const queue = this.getMonth(month)
    if (queue.conflicted || !queue.pending) return
    queue.retryCount = 0
    queue.retryDelay = undefined
    this.schedule(month, queue, 0)
  }

  private retryDelay(attempt: number): number {
    return Math.min(this.debounceMs * (2 ** (attempt - 1)), 30_000)
  }

  private isRetryable(error: unknown): boolean {
    if (!(error instanceof ApiError)) return true
    return error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500
  }
}
