import { describe, expect, it } from 'vitest'
import { buildSystemBlocks, COACH_SYSTEM_PROMPT_STATIC } from './system-prompt'

describe('COACH_SYSTEM_PROMPT_STATIC', () => {
  it.each(['look up', 'propose', 'Confirm', 'compound', 'stalled', 'deload'])(
    'mentions "%s"',
    phrase => expect(COACH_SYSTEM_PROMPT_STATIC).toContain(phrase),
  )

  it.each(['1-click', 'create_routine', 'suggest_exercise_swap', 'Dorian', 'Yates'])(
    'never mentions "%s"',
    phrase => expect(COACH_SYSTEM_PROMPT_STATIC).not.toContain(phrase),
  )

  it('names every tool the coach has', () => {
    for (const tool of ['find_exercises', 'get_routines', 'propose_swap', 'propose_reorder',
      'propose_new_exercise', 'propose_routine', 'propose_split']) {
      expect(COACH_SYSTEM_PROMPT_STATIC).toContain(tool)
    }
  })
})

describe('buildSystemBlocks', () => {
  it('caches only the static block and keeps live context out of it', () => {
    const blocks = buildSystemBlocks('Deload week: yes')

    expect(blocks).toHaveLength(2)
    expect(blocks[0].text).toBe(COACH_SYSTEM_PROMPT_STATIC)
    expect(blocks[0].cache_control).toEqual({ type: 'ephemeral' })
    expect(blocks[1].text).toContain('Deload week: yes')
    expect(blocks[1].cache_control).toBeUndefined()
  })
})
