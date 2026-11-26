import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/app/(app)/profile/actions', () => ({ updateWeeklyGoalAction: vi.fn() }))
vi.mock('@/hooks/useTrainingCycle', () => ({
  useTrainingCycle: () => { throw new Error('ThisWeekCard must get the cycle from the server') },
}))

import { ThisWeekCard } from './ThisWeekCard'

const summary = { thisWeekVolume: 0, lastWeekVolume: 0, thisWeekCount: 1, lastWeekCount: 0, volumeChangePct: null, countChange: null }
const strength = { kind: 'strength' as const, label: 'Strength Week', repRange: { min: 3, max: 5 }, rpeTarget: 8.5, rationale: '' }

describe('ThisWeekCard', () => {
  it('shows the training week it is given, in sentence case', () => {
    const markup = renderToStaticMarkup(
      <ThisWeekCard thisWeekCount={1} goalSessions={3} weeklySummary={summary} missions={[]} nextWorkout={null} scheme={strength} />,
    )
    expect(markup).toContain('Strength week')
    expect(markup).toContain('3–5 reps')
  })
})
