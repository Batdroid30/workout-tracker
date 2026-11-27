import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RepsLeftPrompt, isKeySet, rpeForRepsLeft } from './RepsLeftPrompt'

describe('rpeForRepsLeft', () => {
  it('maps 0 · 1 · 2 · 3+ reps left to RPE 10 / 9 / 8 / 7', () => {
    expect([0, 1, 2, 3].map(n => rpeForRepsLeft(n as 0 | 1 | 2 | 3))).toEqual([10, 9, 8, 7])
  })
})

describe('isKeySet', () => {
  it('is the top set when the plan has one', () => {
    expect(isKeySet('top', 0, 3, true)).toBe(true)
    expect(isKeySet('backoff', 2, 3, true)).toBe(false)
  })

  it('is the last working set when the plan has no top set', () => {
    expect(isKeySet('straight', 2, 3, false)).toBe(true)
    expect(isKeySet('straight', 1, 3, false)).toBe(false)
  })
})

describe('RepsLeftPrompt', () => {
  it('offers 0, 1, 2, 3+ and Skip as full-size targets', () => {
    const markup = renderToStaticMarkup(<RepsLeftPrompt onPick={vi.fn()} onSkip={vi.fn()} />)
    for (const label of ['0', '1', '2', '3+', 'Skip']) expect(markup).toContain(`>${label}</button>`)
    expect(markup.match(/min-h-11/g)).toHaveLength(5)
    expect(markup).toMatch(/<button[^>]*class="[^"]*min-w-11[^"]*"[^>]*>Skip<\/button>/)
  })
})
