import { describe, it, expect } from 'vitest'
import { MAX_TRACKED_LIFTS, TrackedLiftIdsSchema } from './tracked-lifts-schemas'

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`

describe('TrackedLiftIdsSchema', () => {
  it('accepts up to six distinct lifts, or none', () => {
    expect(MAX_TRACKED_LIFTS).toBe(6)
    expect(TrackedLiftIdsSchema.safeParse([]).success).toBe(true)
    expect(TrackedLiftIdsSchema.safeParse([1, 2, 3, 4, 5, 6].map(id)).success).toBe(true)
  })

  it.each([
    ['seven lifts', [1, 2, 3, 4, 5, 6, 7].map(id)],
    ['the same lift twice', [id(1), id(1)]],
    ['an id that is not a uuid', ['bench']],
  ])('rejects %s', (_label, ids) => {
    expect(TrackedLiftIdsSchema.safeParse(ids).success).toBe(false)
  })
})
