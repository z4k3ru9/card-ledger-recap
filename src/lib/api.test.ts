import { describe, expect, it } from 'vitest'
import { ApiError, parseRecapCollection } from './api'

describe('parseRecapCollection', () => {
  it('accepts a valid recap envelope', () => {
    expect(parseRecapCollection({
      recaps: { '2026-09': { banks: [], cashRows: [] } },
      revisions: { '2026-09': 3 },
    })).toEqual({
      recaps: { '2026-09': { banks: [], cashRows: [] } },
      revisions: { '2026-09': 3 },
    })
  })

  it('rejects malformed or unsafe revisions', () => {
    expect(() => parseRecapCollection({ recaps: {}, revisions: { '2026-09': 1.5 } }))
      .toThrowError(ApiError)
    expect(() => parseRecapCollection({ recaps: {}, revisions: { 'not-a-month': 1 } }))
      .toThrowError(ApiError)
  })
})
