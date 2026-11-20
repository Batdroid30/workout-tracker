import { describe, it, expect } from 'vitest'
import { isPhaseTransitionDue } from './phase-transition'
import { DELOAD_THRESHOLDS } from './workout-intelligence'

const threshold = DELOAD_THRESHOLDS.intermediate.bulking

describe('isPhaseTransitionDue', () => {
  it('stays quiet through the planned deload week and the grace weeks after it', () => {
    expect(isPhaseTransitionDue({ experienceLevel: 'intermediate', trainingPhase: 'bulking', phaseWeek: threshold + 1 })).toBe(false)
    expect(isPhaseTransitionDue({ experienceLevel: 'intermediate', trainingPhase: 'bulking', phaseWeek: threshold + 4 })).toBe(false)
  })

  it('is due once the grace weeks are used up', () => {
    expect(isPhaseTransitionDue({ experienceLevel: 'intermediate', trainingPhase: 'bulking', phaseWeek: threshold + 5 })).toBe(true)
  })

  it('assumes intermediate when experience is not set', () => {
    expect(isPhaseTransitionDue({ experienceLevel: null, trainingPhase: 'bulking', phaseWeek: threshold + 5 })).toBe(true)
  })

  it('needs a running phase', () => {
    expect(isPhaseTransitionDue({ experienceLevel: 'intermediate', trainingPhase: null, phaseWeek: 40 })).toBe(false)
    expect(isPhaseTransitionDue({ experienceLevel: 'intermediate', trainingPhase: 'bulking', phaseWeek: null })).toBe(false)
  })
})
