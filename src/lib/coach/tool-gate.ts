import type Anthropic from '@anthropic-ai/sdk'

type ToolUse = Pick<Anthropic.ToolUseBlock, 'type' | 'id' | 'name' | 'input'>
type Block = ToolUse | { type: string }

// The coach's tools change things (create_routine saves a routine). They only
// run while the lifter is still there: after Stop, or once they've left, the
// reply text is still saved but nothing is created that they never saw asked.
export function toolCallsToRun<B extends Block>(content: B[], clientConnected: boolean): Extract<B, { type: 'tool_use' }>[] {
  if (!clientConnected) return []
  return content.filter((block): block is Extract<B, { type: 'tool_use' }> => block.type === 'tool_use')
}
