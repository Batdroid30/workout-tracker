import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { CoachProposalSchema, proposalHistoryLine } from '@/lib/coach/proposals'
import type { CoachMessage } from '@/types/coach'

// Stored metadata is jsonb written by an earlier request, so it is parsed, not trusted.
function storedProposalLines(metadata: CoachMessage['metadata']): string[] {
  const stored = metadata?.proposals ?? []
  return stored.flatMap(candidate => {
    const parsed = CoachProposalSchema.safeParse(candidate)
    return parsed.success ? [proposalHistoryLine(parsed.data)] : []
  })
}

// Appends what the coach proposed (and what became of it) to its own earlier
// messages, so "use the other one" has something to refer to.
export function toClaudeHistory(messages: CoachMessage[]): BetaMessageParam[] {
  return messages.map(message => {
    if (message.role !== 'assistant') return { role: 'user', content: message.content }
    const lines = storedProposalLines(message.metadata)
    return {
      role: 'assistant',
      content: [message.content, ...lines].join('\n'),
    }
  })
}
