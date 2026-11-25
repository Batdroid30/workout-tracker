import type {
  BetaContentBlock,
  BetaMessage,
  BetaMessageParam,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages'
import type { CoachProposal } from '@/lib/coach/proposals'
import type { CoachStreamEvent } from '@/types/coach'

// Each round is one model call. Five covers "look up, read, propose, answer"
// with room for a retry after a rejected proposal, while capping the spend of
// a model that keeps asking for tools.
export const MAX_TOOL_ROUNDS = 5

const ROUND_SEPARATOR = '\n\n'
const REFUSAL_TEXT = "I can't help with that one. Ask me something about your training."
const LIFTER_LEFT_RESULT = 'Not proposed: the lifter has left the chat, so nothing was shown to them. Do not say a change was proposed.'
const TOOL_FAILED_RESULT = 'The tool failed to run. Tell the lifter you could not complete this step.'

// The model's streamed text, then its full reply once the stream ends.
export interface ModelReply extends AsyncIterable<string> {
  final(): Promise<Pick<BetaMessage, 'content' | 'stop_reason'>>
}

export interface ToolOutcome {
  forModel: string
  proposal?: CoachProposal
  isError?: boolean
}

export interface CoachTurnDeps {
  createMessage: (messages: BetaMessageParam[]) => ModelReply
  executeTool: (name: string, input: unknown) => Promise<ToolOutcome>
  send: (event: CoachStreamEvent) => void
  isOpen: () => boolean
}

export interface CoachTurnResult {
  text: string
  proposals: CoachProposal[]
  rounds: number
}

// Write proposals become cards the lifter must see to confirm; lookups only
// inform the model, so they may run after the lifter has gone.
function isProposeTool(name: string): boolean {
  return name.startsWith('propose_')
}

function toolUsesIn(content: BetaContentBlock[]): BetaToolUseBlock[] {
  return content.filter((block): block is BetaToolUseBlock => block.type === 'tool_use')
}

function toolResult(toolUseId: string, content: string, isError: boolean): BetaToolResultBlockParam {
  return isError
    ? { type: 'tool_result', tool_use_id: toolUseId, content, is_error: true }
    : { type: 'tool_result', tool_use_id: toolUseId, content }
}

async function safelyExecute(deps: CoachTurnDeps, toolUse: BetaToolUseBlock): Promise<ToolOutcome> {
  try {
    return await deps.executeTool(toolUse.name, toolUse.input)
  } catch (error: unknown) {
    console.error(`Coach tool ${toolUse.name} failed:`, error)
    return { forModel: TOOL_FAILED_RESULT, isError: true }
  }
}

async function runTool(
  deps: CoachTurnDeps,
  toolUse: BetaToolUseBlock,
  proposals: CoachProposal[],
): Promise<BetaToolResultBlockParam> {
  if (isProposeTool(toolUse.name) && !deps.isOpen()) {
    return toolResult(toolUse.id, LIFTER_LEFT_RESULT, true)
  }
  const outcome = await safelyExecute(deps, toolUse)
  if (outcome.proposal) {
    proposals.push(outcome.proposal)
    deps.send({ type: 'proposal', proposal: outcome.proposal })
  }
  return toolResult(toolUse.id, outcome.forModel, outcome.isError ?? false)
}

// Streams one round's text to the lifter. A later round's text starts a new
// paragraph so it doesn't run on from the last round's sentence.
async function streamRound(deps: CoachTurnDeps, reply: ModelReply, textSoFar: string): Promise<string> {
  let text = textSoFar
  let isFirstDelta = true
  for await (const delta of reply) {
    const chunk = isFirstDelta && text ? `${ROUND_SEPARATOR}${delta}` : delta
    isFirstDelta = false
    text += chunk
    deps.send({ type: 'text_delta', text: chunk })
  }
  return text
}

function appendRefusal(deps: CoachTurnDeps, textSoFar: string): string {
  const chunk = textSoFar ? `${ROUND_SEPARATOR}${REFUSAL_TEXT}` : REFUSAL_TEXT
  deps.send({ type: 'text_delta', text: chunk })
  return textSoFar + chunk
}

export async function runCoachTurn(deps: CoachTurnDeps, messages: BetaMessageParam[]): Promise<CoachTurnResult> {
  const conversation = [...messages]
  const proposals: CoachProposal[] = []
  let text = ''

  for (let round = 1; round <= MAX_TOOL_ROUNDS; round++) {
    const reply = deps.createMessage(conversation)
    text = await streamRound(deps, reply, text)
    const message = await reply.final()

    if (message.stop_reason === 'refusal') return { text: appendRefusal(deps, text), proposals, rounds: round }
    const toolUses = toolUsesIn(message.content)
    if (message.stop_reason !== 'tool_use' || toolUses.length === 0 || round === MAX_TOOL_ROUNDS) {
      return { text, proposals, rounds: round }
    }

    // Sequential on purpose: proposals must be recorded in the order the
    // model made them, and the isOpen check must see the latest state.
    const results: BetaToolResultBlockParam[] = []
    for (const toolUse of toolUses) results.push(await runTool(deps, toolUse, proposals))

    conversation.push({ role: 'assistant', content: message.content }, { role: 'user', content: results })
  }

  return { text, proposals, rounds: MAX_TOOL_ROUNDS }
}
