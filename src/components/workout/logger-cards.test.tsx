import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const STARTED = Date.UTC(2026, 10, 20, 10, 0, 0)
let now = STARTED + (24 * 60 + 13) * 1000
vi.mock('@/hooks/useNow', () => ({ useNow: () => now }))

import { LoggerHeader } from './LoggerHeader'
import { RestBar } from './RestBar'
import { ExerciseTallyRow } from './ExerciseTallyRow'
import { SetTableHeader } from './SetTableHeader'

describe('LoggerHeader', () => {
  it('shows the live clock, progress, one lime Finish and a minimize button', () => {
    const markup = renderToStaticMarkup(
      <LoggerHeader
        title="Push A" onTitleChange={vi.fn()} startedAt={new Date(STARTED)}
        progress={{ done: 3, total: 5 }} weekChip="Hypertrophy week · 8–12 reps · RPE 7.5"
        onMinimize={vi.fn()} onFinish={vi.fn()} isFinishing={false}
      />,
    )
    expect(markup).toContain('24:13 · 3 of 5 exercises')
    expect(markup).toContain('aria-label="Minimize workout"')
    expect(markup).toContain('Hypertrophy week · 8–12 reps · RPE 7.5')
    expect(markup.match(/bg-accent /g)).toHaveLength(1)
  })
})

describe('RestBar', () => {
  it('counts down with +30s and Skip', () => {
    now = 1_000_000
    const markup = renderToStaticMarkup(
      <RestBar rest={{ endsAt: now + 74_000, totalSeconds: 90, nextLabel: 'Lateral Raise' }} onExtend={vi.fn()} onSkip={vi.fn()} />,
    )
    expect(markup).toContain('1:14')
    expect(markup).toContain('Rest · then Lateral Raise')
    expect(markup).toContain('+30s')
    expect(markup).toContain('Skip')
  })

  it('says rest is over once the time has passed, however long ago', () => {
    now = 1_000_000
    const markup = renderToStaticMarkup(
      <RestBar rest={{ endsAt: now - 600_000, totalSeconds: 90, nextLabel: null }} onExtend={vi.fn()} onSkip={vi.fn()} />,
    )
    expect(markup).toContain('Rest over')
  })

  it('shows nothing without a rest', () => {
    expect(renderToStaticMarkup(<RestBar rest={null} onExtend={vi.fn()} onSkip={vi.fn()} />)).toBe('')
  })
})

describe('ExerciseTallyRow', () => {
  it('marks a finished exercise with a positive tick', () => {
    const markup = renderToStaticMarkup(
      <ExerciseTallyRow name="Bench Press (Barbell)" muscle="chest" tally={{ done: 3, total: 3, complete: true }} onOpen={vi.fn()} />,
    )
    expect(markup).toMatch(/text-positive[^>]*>3\/3 ✓/)
    expect(markup).toContain('aria-label="Open Bench Press (Barbell)"')
  })

  it('shows progress for an exercise in progress', () => {
    const markup = renderToStaticMarkup(
      <ExerciseTallyRow name="Lateral Raise" muscle="shoulders" tally={{ done: 1, total: 3, complete: false }} onOpen={vi.fn()} />,
    )
    expect(markup).toContain('1/3')
    expect(markup).not.toContain('✓')
  })
})

describe('SetTableHeader', () => {
  it('labels the set columns', () => {
    const markup = renderToStaticMarkup(<SetTableHeader />)
    for (const label of ['Set', 'Last time', 'kg', 'Reps']) expect(markup).toContain(`>${label}<`)
  })
})
