import type { RecapsByMonth } from './types'

const MAX_SUGGESTIONS = 100

/** Shared <datalist> id - description inputs point their `list` at this. */
export const ITEM_SUGGESTIONS_LIST_ID = 'item-suggestions'

/**
 * Distinct "Item" descriptions seen anywhere across every month already
 * loaded from the database, most-used first - so typing a repeated item
 * (e.g. "Groceries - Superindo") can autocomplete from what's actually
 * been entered before, without a dedicated search endpoint.
 */
export function collectItemSuggestions(recaps: RecapsByMonth): string[] {
  const counts = new Map<string, number>()

  function record(description: string) {
    const trimmed = description.trim()
    if (!trimmed) return
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1)
  }

  for (const recap of Object.values(recaps)) {
    for (const bank of recap.banks) {
      for (const row of bank.transactions) record(row.description)
    }
    for (const row of recap.cashRows) record(row.description)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_SUGGESTIONS)
    .map(([description]) => description)
}
