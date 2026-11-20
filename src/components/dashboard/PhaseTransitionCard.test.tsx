import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/app/(app)/profile/actions', () => ({ updateTrainingProfileAction: vi.fn() }))

import { DELOAD_THRESHOLDS } from '@/lib/workout-intelligence'
import { PhaseTransitionCard } from './PhaseTransitionCard'

const BLOCK = DELOAD_THRESHOLDS.intermediate.maingaining

describe('PhaseTransitionCard', () => {
  it('stays hidden for a lifter returning from a break early in their phase', () => {
    const markup = renderToStaticMarkup(
      <PhaseTransitionCard experienceLevel="intermediate" trainingPhase="maingaining" phaseWeek={2} />,
    )
    expect(markup).toBe('')
  })

  it('suggests a transition after enough training weeks', () => {
    const markup = renderToStaticMarkup(
      <PhaseTransitionCard experienceLevel="intermediate" trainingPhase="maingaining" phaseWeek={BLOCK + 6} />,
    )
    expect(markup).toContain(`${BLOCK + 5} weeks`)
  })
})
