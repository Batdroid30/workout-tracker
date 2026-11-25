import { describe, it, expect } from 'vitest'
import { editableMeta } from './editable-meta'

describe('editableMeta', () => {
  it('fills the edit form from the saved workout, duration in minutes', () => {
    expect(editableMeta('Push A', 6667, 'Felt strong')).toEqual({ title: 'Push A', minutes: 111, notes: 'Felt strong' })
  })

  it('starts empty for missing values', () => {
    expect(editableMeta(null, null, null)).toEqual({ title: '', minutes: 0, notes: '' })
  })
})
