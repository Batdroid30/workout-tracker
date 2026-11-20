import { describe, it, expect } from 'vitest'
import { pickerReducer, toPickerOptions } from './tracked-lifts-picker'

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

describe('opening the picker again', () => {
  it('starts from what the list shows, not from abandoned edits', () => {
    const abandoned = { picked: ['x'], error: 'Pick up to 6 lifts' }
    expect(pickerReducer(abandoned, { type: 'seed', ids: ['a', 'b'] })).toEqual({ picked: ['a', 'b'], error: null })
  })
})

describe('toPickerOptions', () => {
  const exercises = [
    { id: 'bench', name: 'Bench Press', muscle_group: 'chest' },
    { id: 'curl', name: 'Curl', muscle_group: 'biceps' },
  ]

  it('labels how often you train a lift by sets, most-trained first', () => {
    const options = toPickerOptions({ exercises, frequency: { bench: 87, curl: 12 }, initial: [], withData: ['bench'] })
    expect(options.map(option => option.detail)).toEqual(['chest · 87 sets', 'biceps · 12 sets'])
    expect(options.map(option => option.hasData)).toEqual([true, false])
  })

  it('keeps a picked lift the store has not loaded yet', () => {
    const options = toPickerOptions({ exercises: [], frequency: {}, initial: [{ id: 'squat', name: 'Squat' }], withData: [] })
    expect(options).toEqual([{ id: 'squat', name: 'Squat', detail: '', hasData: false }])
  })
})
