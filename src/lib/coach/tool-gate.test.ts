import { describe, it, expect } from 'vitest'
import { toolCallsToRun } from './tool-gate'

const content = [
  { type: 'text' as const, text: 'Here is your split.' },
  { type: 'tool_use' as const, id: 't1', name: 'create_routine', input: { title: 'Upper' } },
  { type: 'tool_use' as const, id: 't2', name: 'suggest_exercise_swap', input: {} },
]

describe('toolCallsToRun', () => {
  it('runs every tool call while the lifter is still in the chat', () => {
    expect(toolCallsToRun(content, true).map(call => call.name)).toEqual(['create_routine', 'suggest_exercise_swap'])
  })

  it('runs none once the lifter has stopped the reply or left, so no routine appears unasked', () => {
    expect(toolCallsToRun(content, false)).toEqual([])
  })
})
