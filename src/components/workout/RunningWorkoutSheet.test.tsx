import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RunningWorkoutChoices } from './RunningWorkoutSheet'

describe('RunningWorkoutChoices', () => {
  it('offers to resume the running workout before replacing it', () => {
    const markup = renderToStaticMarkup(
      <RunningWorkoutChoices runningTitle="Push A" nextLabel="Pull A" onResume={vi.fn()} onReplace={vi.fn()} />,
    )
    expect(markup).toContain('Push A is still running')
    expect(markup).toMatch(/<button[^>]*bg-accent [^>]*>[^<]*Resume Push A/)
    expect(markup).toMatch(/<button[^>]*text-negative[^>]*>[^<]*Discard it and start Pull A/)
  })
})
