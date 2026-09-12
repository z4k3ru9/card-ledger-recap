import { useCallback, useEffect, useRef } from 'react'
import { saveRecap } from './api'
import type { MonthRecap } from './types'

interface PendingSave {
  month: string
  recap: MonthRecap
}

export function useRecapAutosave(
  month: string,
  recap: MonthRecap | undefined,
  enabled: boolean,
) {
  const pending = useRef<PendingSave | null>(null)
  const timer = useRef<number | null>(null)

  const flush = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    const next = pending.current
    pending.current = null
    if (next) void saveRecap(next.month, next.recap)
  }, [])

  useEffect(() => {
    if (!enabled || !recap) return

    pending.current = { month, recap }
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const next = pending.current
      pending.current = null
      timer.current = null
      if (next) void saveRecap(next.month, next.recap)
    }, 600)

    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
        timer.current = null
      }
    }
  }, [enabled, month, recap])

  useEffect(() => () => flush(), [flush])

  return { flush }
}
