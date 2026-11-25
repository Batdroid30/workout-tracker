import { describe, it, expect, vi } from 'vitest'
import type { BetaContentBlock, BetaMessageParam, BetaStopReason } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { runCoachTurn, MAX_TOOL_ROUNDS, type CoachTurnDeps, type ModelReply, type ToolOutcome } from './coach-turn'
import type { CoachProposal } from '@/lib/coach/proposals'
import type { CoachStreamEvent } from '@/types/coach'

interface ScriptedReply {
  text?: string
  tools?: { id: string; name: string; input: unknown }[]
  stopReason?: BetaStopReason
}

function toReply({ text, tools = [], stopReason }: ScriptedReply): ModelReply {
  const textBlocks: BetaContentBlock[] = text ? [{ type: 'text', text, citations: null }] : []
  const toolBlocks: BetaContentBlock[] = tools.map(tool => ({ type: 'tool_use', ...tool }))
  const message = {
    content: [...textBlocks, ...toolBlocks],
    stop_reason: stopReason ?? (tools.length > 0 ? 'tool_use' : 'end_turn'),
  }
  return {
    async *[Symbol.asyncIterator]() {
      if (text) yield text
    },
    final: async () => message,
  }
}

// Plays the scripted replies in order (repeating the last one) and keeps a
// copy of every request so tests can inspect what the model was sent.
function scriptedModel(replies: ScriptedReply[]) {
  const requests: BetaMessageParam[][] = []
  const createMessage = vi.fn((messages: BetaMessageParam[]) => {
    requests.push(structuredClone(messages))
    return toReply(replies[Math.min(requests.length - 1, replies.length - 1)])
  })
  return { createMessage, requests }
}

const swapProposal: CoachProposal = {
  id: 'p1',
  status: 'pending',
  label: 'Swap in Push',
  kind: 'swap',
  routine_id: 'r1',
  routine_title: 'Push',
  position: 1,
  old_exercise_id: 'e1',
  old_name: 'Bench Press',
  new_exercise_id: 'e2',
  new_name: 'Dumbbell Press',
  target_sets: 3,
  target_reps: 8,
  reason: 'Shoulder-friendly',
  stamp: [{ exercise_id: 'e1', target_sets: 3, target_reps: 8 }],
}

function makeDeps(
  createMessage: CoachTurnDeps['createMessage'],
  overrides: Partial<CoachTurnDeps> = {},
): CoachTurnDeps & { events: CoachStreamEvent[] } {
  const events: CoachStreamEvent[] = []
  return {
    createMessage,
    executeTool: vi.fn(async (): Promise<ToolOutcome> => ({ forModel: '{"exercises":[]}' })),
    send: event => events.push(event),
    isOpen: () => true,
    events,
    ...overrides,
  }
}

const userAsks: BetaMessageParam[] = [{ role: 'user', content: 'Swap my bench press' }]

function toolResultsIn(request: BetaMessageParam[]) {
  const last = request[request.length - 1]
  if (last.role !== 'user' || typeof last.content === 'string') return []
  return last.content.filter(block => block.type === 'tool_result')
}

describe('runCoachTurn', () => {
  it('streams a text-only answer in one round with no proposals', async () => {
    const { createMessage } = scriptedModel([{ text: 'Train hard.' }])
    const deps = makeDeps(createMessage)

    const result = await runCoachTurn(deps, userAsks)

    expect(result).toEqual({ text: 'Train hard.', proposals: [], rounds: 1 })
    expect(deps.events).toEqual([{ type: 'text_delta', text: 'Train hard.' }])
  })

  it('feeds a lookup result back to the model before it answers', async () => {
    const { createMessage, requests } = scriptedModel([
      { text: 'Checking.', tools: [{ id: 'tu_1', name: 'find_exercises', input: { query: 'press' } }] },
      { text: 'Use the dumbbell press.' },
    ])
    const deps = makeDeps(createMessage)

    const result = await runCoachTurn(deps, userAsks)

    expect(result.rounds).toBe(2)
    expect(deps.executeTool).toHaveBeenCalledWith('find_exercises', { query: 'press' })
    expect(requests[1][1]).toMatchObject({ role: 'assistant' })
    expect(toolResultsIn(requests[1])).toEqual([
      { type: 'tool_result', tool_use_id: 'tu_1', content: '{"exercises":[]}' },
    ])
    expect(result.text).toBe('Checking.\n\nUse the dumbbell press.')
  })

  it('sends all of a round\'s tool results together in one user message', async () => {
    const { createMessage, requests } = scriptedModel([
      {
        tools: [
          { id: 'tu_1', name: 'find_exercises', input: {} },
          { id: 'tu_2', name: 'get_routines', input: {} },
        ],
      },
      { text: 'Done.' },
    ])

    await runCoachTurn(makeDeps(createMessage), userAsks)

    expect(requests[1]).toHaveLength(3)
    expect(toolResultsIn(requests[1]).map(block => block.tool_use_id)).toEqual(['tu_1', 'tu_2'])
  })

  it('records a proposal, sends it as a proposal event and returns it', async () => {
    const { createMessage } = scriptedModel([
      { tools: [{ id: 'tu_1', name: 'propose_swap', input: { routine_id: 'r1' } }] },
      { text: 'Proposed. Confirm it if you agree.' },
    ])
    const deps = makeDeps(createMessage, {
      executeTool: vi.fn(async () => ({ forModel: 'Proposal shown to the lifter.', proposal: swapProposal })),
    })

    const result = await runCoachTurn(deps, userAsks)

    expect(result.proposals).toEqual([swapProposal])
    expect(deps.events).toContainEqual({ type: 'proposal', proposal: swapProposal })
  })

  it('returns tool failures to the model as error results', async () => {
    const { createMessage, requests } = scriptedModel([
      { tools: [{ id: 'tu_1', name: 'propose_swap', input: {} }] },
      { text: 'Let me fix that.' },
    ])
    const deps = makeDeps(createMessage, {
      executeTool: vi.fn(async () => ({ forModel: 'No routine with id "x".', isError: true })),
    })

    await runCoachTurn(deps, userAsks)

    expect(toolResultsIn(requests[1])).toEqual([
      { type: 'tool_result', tool_use_id: 'tu_1', content: 'No routine with id "x".', is_error: true },
    ])
  })

  it('answers a tool that throws with an error result instead of failing the turn', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { createMessage, requests } = scriptedModel([
      { tools: [{ id: 'tu_1', name: 'get_routines', input: {} }] },
      { text: 'Could not read them.' },
    ])
    const deps = makeDeps(createMessage, {
      executeTool: vi.fn(async () => { throw new Error('db down') }),
    })

    const result = await runCoachTurn(deps, userAsks)

    expect(result.text).toBe('Could not read them.')
    expect(toolResultsIn(requests[1])[0]).toMatchObject({ tool_use_id: 'tu_1', is_error: true })
  })

  it(`stops after ${MAX_TOOL_ROUNDS} rounds when the model keeps asking for tools`, async () => {
    const { createMessage } = scriptedModel([
      { text: 'Looking.', tools: [{ id: 'tu_n', name: 'find_exercises', input: {} }] },
    ])
    const deps = makeDeps(createMessage)

    const result = await runCoachTurn(deps, userAsks)

    expect(createMessage).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS)
    expect(result.rounds).toBe(MAX_TOOL_ROUNDS)
    expect(result.text).toBe(Array(MAX_TOOL_ROUNDS).fill('Looking.').join('\n\n'))
  })

  it('records no proposal once the lifter has left, but still runs lookups and keeps the text', async () => {
    const { createMessage, requests } = scriptedModel([
      { tools: [{ id: 'tu_1', name: 'get_routines', input: {} }] },
      { text: 'Here is the swap.', tools: [{ id: 'tu_2', name: 'propose_swap', input: { routine_id: 'r1' } }] },
      { text: 'Confirm it when ready.' },
    ])
    let open = true
    const executeTool = vi.fn(async (name: string): Promise<ToolOutcome> => {
      if (name === 'get_routines') open = false
      return { forModel: 'ok', proposal: name === 'propose_swap' ? swapProposal : undefined }
    })
    const deps = makeDeps(createMessage, { executeTool, isOpen: () => open })

    const result = await runCoachTurn(deps, userAsks)

    expect(executeTool).toHaveBeenCalledTimes(1)
    expect(executeTool).toHaveBeenCalledWith('get_routines', {})
    expect(result.proposals).toEqual([])
    expect(deps.events.some(event => event.type === 'proposal')).toBe(false)
    expect(toolResultsIn(requests[2])[0]).toMatchObject({ tool_use_id: 'tu_2', is_error: true })
    expect(JSON.stringify(toolResultsIn(requests[2])[0])).toMatch(/left/)
    expect(result.text).toBe('Here is the swap.\n\nConfirm it when ready.')
  })

  it('ends with a short apology when the model refuses', async () => {
    const { createMessage } = scriptedModel([{ stopReason: 'refusal' }])
    const deps = makeDeps(createMessage)

    const result = await runCoachTurn(deps, userAsks)

    expect(result.rounds).toBe(1)
    expect(result.text.length).toBeGreaterThan(0)
    expect(deps.events).toEqual([{ type: 'text_delta', text: result.text }])
  })
})
