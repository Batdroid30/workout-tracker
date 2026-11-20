import { describe, it, expect } from 'vitest'
import { readCoachPrompt } from './read-coach-prompt'

describe('readCoachPrompt', () => {
  it('keeps a prompt with a percentage sign intact', () => {
    // Next has already decoded the query string; decoding again throws on "%".
    const prompt = 'My Bench Press has stalled around 85.2kg (+0.4% change over 3 weeks). What should I change?'
    expect(readCoachPrompt(prompt)).toBe(prompt)
  })

  it('ignores an empty or missing prompt', () => {
    expect(readCoachPrompt(undefined)).toBeUndefined()
    expect(readCoachPrompt('   ')).toBeUndefined()
  })

  it('takes the first value when the parameter repeats', () => {
    expect(readCoachPrompt(['First', 'Second'])).toBe('First')
  })

  it('caps very long prompts', () => {
    expect(readCoachPrompt('x'.repeat(5000))?.length).toBe(1000)
  })
})
