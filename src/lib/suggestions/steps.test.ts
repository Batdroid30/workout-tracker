import { describe, it, expect } from 'vitest'
import {
  toEquipmentKind,
  defaultWeightStep,
  progressionIncrement,
  roundDownToStep,
  roundToStep,
} from './steps'

describe('toEquipmentKind', () => {
  it('normalises case and known names', () => {
    expect(toEquipmentKind('Dumbbell')).toBe('dumbbell')
    expect(toEquipmentKind('ez-bar')).toBe('ez-bar')
  })
  it('falls back to other', () => {
    expect(toEquipmentKind(null)).toBe('other')
    expect(toEquipmentKind('kettlebell')).toBe('other')
  })
})

describe('defaultWeightStep', () => {
  it('uses 5kg for machines and 2.5kg for dumbbells', () => {
    expect(defaultWeightStep('machine')).toBe(5)
    expect(defaultWeightStep('dumbbell')).toBe(2.5)
  })
})

describe('progressionIncrement', () => {
  const base = { weightStepKg: 2.5, experience: 'beginner', movement: 'compound', equipment: 'barbell' } as const
  it('doubles the step for beginner barbell compounds', () => {
    expect(progressionIncrement(base)).toBe(5)
  })
  it('uses one step otherwise', () => {
    expect(progressionIncrement({ ...base, equipment: 'dumbbell' })).toBe(2.5)
    expect(progressionIncrement({ ...base, experience: 'intermediate' })).toBe(2.5)
  })
})

describe('rounding', () => {
  it('rounds down to a step', () => {
    expect(roundDownToStep(31.5, 2.5)).toBe(30)
    expect(roundDownToStep(35.3, 2)).toBe(34)
    expect(roundDownToStep(30, 2.5)).toBe(30)
  })
  it('never returns below one step', () => {
    expect(roundDownToStep(1, 2.5)).toBe(2.5)
    expect(roundToStep(0, 2.5)).toBe(2.5)
  })
  it('rounds to the nearest step', () => {
    expect(roundToStep(87, 2.5)).toBe(87.5)
  })
})
