import { describe, it, expect } from 'vitest'
import { SplitInputSchema, splitRenamePayload } from './split-schemas'

const PUSH = '11111111-1111-4111-8111-111111111111'
const LEGS = '22222222-2222-4222-8222-222222222222'

const valid = { name: 'Push pull legs', items: [{ routineId: PUSH }, { routineId: null }, { routineId: LEGS }] }

describe('SplitInputSchema', () => {
  it('accepts routines mixed with rest days', () => {
    expect(SplitInputSchema.safeParse(valid).success).toBe(true)
  })

  it('trims the name', () => {
    expect(SplitInputSchema.parse({ ...valid, name: '  PPL  ' }).name).toBe('PPL')
  })

  it.each([
    ['an empty name', { ...valid, name: '   ' }],
    ['a name over 60 characters', { ...valid, name: 'x'.repeat(61) }],
    ['no items', { ...valid, items: [] }],
    ['more than 14 items', { ...valid, items: Array.from({ length: 15 }, () => ({ routineId: PUSH })) }],
    ['only rest days', { ...valid, items: [{ routineId: null }, { routineId: null }] }],
    ['a routine id that is not a uuid', { ...valid, items: [{ routineId: 'push' }] }],
  ])('rejects %s', (_label, input) => {
    expect(SplitInputSchema.safeParse(input).success).toBe(false)
  })
})

describe('splitRenamePayload', () => {
  it('clears a skip pointer, because saving renumbers the days', () => {
    expect(splitRenamePayload('PPL')).toEqual({ name: 'PPL', skip_to_position: null, skip_set_at: null })
  })
})
