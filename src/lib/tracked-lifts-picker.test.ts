import { describe, it, expect } from 'vitest'
import { pickerReducer } from './tracked-lifts-picker'

const start = (picked: string[]) => ({ picked, error: null })

describe('pickerReducer', () => {
  it('adds and removes a lift', () => {
    const added = pickerReducer(start(['a']), { type: 'toggle', id: 'b' })
    expect(added.picked).toEqual(['a', 'b'])
    expect(pickerReducer(added, { type: 'toggle', id: 'a' }).picked).toEqual(['b'])
  })

  it('stops at six and says why', () => {
    const full = start(['a', 'b', 'c', 'd', 'e', 'f'])
    const next = pickerReducer(full, { type: 'toggle', id: 'g' })
    expect(next.picked).toHaveLength(6)
    expect(next.error).toBe('Pick up to 6 lifts')
  })

  it('clears the warning once a lift is removed', () => {
    const warned = { picked: ['a', 'b', 'c', 'd', 'e', 'f'], error: 'Pick up to 6 lifts' }
    expect(pickerReducer(warned, { type: 'toggle', id: 'a' }).error).toBeNull()
  })

  it('reorders by drag', () => {
    expect(pickerReducer(start(['a', 'b', 'c']), { type: 'move', from: 'c', to: 'a' }).picked).toEqual(['c', 'a', 'b'])
  })

  it('goes back to automatic', () => {
    expect(pickerReducer(start(['a', 'b']), { type: 'reset' }).picked).toEqual([])
  })
})
