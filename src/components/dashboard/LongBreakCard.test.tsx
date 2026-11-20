import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/providers/ToastProvider', () => ({ useToast: () => ({ error: vi.fn() }) }))
vi.mock('@/app/(app)/account/training-actions', () => ({
  restartPhaseAction: vi.fn(),
  dismissBreakPromptAction: vi.fn(),
}))

import { LongBreakCard } from './LongBreakCard'

describe('LongBreakCard', () => {
  it('says how long the break was and offers both choices', () => {
    const markup = renderToStaticMarkup(<LongBreakCard missedWeeks={3} />)
    expect(markup).toContain('3 light weeks in a row')
    expect(markup).toContain('Restart')
    expect(markup).toContain('Keep going')
  })

  it('uses the plural for every break it is shown for', () => {
    const markup = renderToStaticMarkup(<LongBreakCard missedWeeks={2} />)
    expect(markup).toContain('2 light weeks')
    expect(markup).not.toContain('2 light week ')
  })
})
