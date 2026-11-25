import { describe, expect, it } from 'vitest'
import { toClaudeHistory } from './history'
import { proposalHistoryLine, type CoachProposal } from './proposals'
import type { CoachMessage } from '@/types/coach'

const dismissedSplit: CoachProposal = {
  id: 'p1', status: 'dismissed', label: 'Split', kind: 'split', name: 'PPL', days: [],
}

function message(overrides: Partial<CoachMessage>): CoachMessage {
  return {
    id: 'm1', conversation_id: 'c1', role: 'assistant', content: 'Try this.',
    metadata: null, created_at: '2026-01-01T00:00:00Z', ...overrides,
  }
}

describe('toClaudeHistory', () => {
  it('appends a line for each stored proposal of an assistant message', () => {
    const [entry] = toClaudeHistory([message({ metadata: { proposals: [dismissedSplit] } })])

    expect(entry.content).toBe(`Try this.\n${proposalHistoryLine(dismissedSplit)}`)
  })

  it('leaves messages without proposals untouched', () => {
    const history = toClaudeHistory([
      message({ role: 'user', content: 'Hi' }),
      message({ content: 'Hello' }),
    ])

    expect(history).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
    ])
  })

  it('skips stored proposals that do not parse', () => {
    const corrupt = { metadata: { proposals: [{ kind: 'nope' }] } } as unknown as Partial<CoachMessage>
    const [entry] = toClaudeHistory([message(corrupt)])

    expect(entry.content).toBe('Try this.')
  })
})
