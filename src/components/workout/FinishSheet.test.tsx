import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { FinishChoices } from './FinishSheet'

const handlers = { onFinish: vi.fn(), onDiscard: vi.fn(), onKeepGoing: vi.fn(), onToggleRoutine: vi.fn() }

describe('FinishChoices', () => {
  it('offers to tick the leftovers, with one lime action', () => {
    const markup = renderToStaticMarkup(
      <FinishChoices situation={{ kind: 'unticked', count: 2 }} routineTitle={null} updateRoutine={false} {...handlers} />,
    )
    expect(markup).toContain('2 sets aren&#x27;t ticked')
    expect(markup).toContain('Tick them and finish')
    expect(markup).toContain('Finish without them')
    expect(markup).toContain('Keep going')
    expect(markup.match(/bg-accent /g)).toHaveLength(1)
  })

  it('asks before updating a changed routine', () => {
    const markup = renderToStaticMarkup(
      <FinishChoices situation={{ kind: 'ready' }} routineTitle="Push A" updateRoutine={false} {...handlers} />,
    )
    expect(markup).toContain('Update Push A with today&#x27;s changes')
    expect(markup).toContain('aria-pressed="false"')
  })

  it('only offers discard for an empty workout', () => {
    const markup = renderToStaticMarkup(
      <FinishChoices situation={{ kind: 'empty' }} routineTitle={null} updateRoutine={false} {...handlers} />,
    )
    expect(markup).toContain('Nothing logged yet')
    expect(markup).toContain('Discard workout')
    expect(markup).not.toContain('bg-accent ')
  })
})
