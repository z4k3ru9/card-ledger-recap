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
}

interface SaveQueueEvents {
  onState: (month: string, state: SaveState) => void
  onUnauthorized: () => void
  onConflict: (month: string) => void
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
    this.paused = false
    for (const [month, queue] of this.months) {
      if (queue.pending && !queue.conflicted) this.schedule(month, queue, 0)
    }
  }

  dispose(): void {
    this.paused = true
    for (const queue of this.months.values()) {
      if (queue.timer) clearTimeout(queue.timer)
    }
  }

  private getMonth(month: string): MonthQueue {
    let queue = this.months.get(month)
    if (!queue) {
      queue = { revision: 0, inFlight: false, conflicted: false }
      this.months.set(month, queue)
    }
    return queue
  }

  private schedule(month: string, queue: MonthQueue, delay = this.debounceMs): void {
    if (this.paused || queue.inFlight || queue.conflicted) return
    if (queue.timer) clearTimeout(queue.timer)
    queue.timer = setTimeout(() => {
      queue.timer = undefined
      void this.drain(month, queue)
    }, delay)
  }

  private async drain(month: string, queue: MonthQueue): Promise<void> {
    if (this.paused || queue.inFlight || queue.conflicted || !queue.pending) return
    const snapshot = queue.pending
    queue.pending = undefined
    queue.inFlight = true
    this.events.onState(month, 'saving')

    try {
      queue.revision = await this.save(month, snapshot, queue.revision)
      this.events.onState(month, queue.pending ? 'unsaved' : 'saved')
    } catch (error) {
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
      }
    } finally {
      queue.inFlight = false
      if (queue.pending && !this.paused && !queue.conflicted) {
        this.schedule(month, queue, 0)
      }
    }
  }
}
