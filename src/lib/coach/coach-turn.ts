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
  // A model call after the first failed; text and proposals are what earlier
  // rounds produced.
  incomplete: boolean
}

interface TurnState {
  text: string
  proposals: CoachProposal[]
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

// Streams one round's text to the lifter, adding it to the turn as it comes so
// a call that fails midway keeps what was already shown. A later round's text
// starts a new paragraph so it doesn't run on from the last round's sentence.
async function streamRound(deps: CoachTurnDeps, reply: ModelReply, state: TurnState): Promise<void> {
  let isFirstDelta = true
  for await (const delta of reply) {
    const chunk = isFirstDelta && state.text ? `${ROUND_SEPARATOR}${delta}` : delta
    isFirstDelta = false
    state.text += chunk
    deps.send({ type: 'text_delta', text: chunk })
  }
}

async function callModel(deps: CoachTurnDeps, conversation: BetaMessageParam[], state: TurnState) {
  const reply = deps.createMessage(conversation)
  await streamRound(deps, reply, state)
  return reply.final()
}

function appendRefusal(deps: CoachTurnDeps, state: TurnState): void {
  const chunk = state.text ? `${ROUND_SEPARATOR}${REFUSAL_TEXT}` : REFUSAL_TEXT
  deps.send({ type: 'text_delta', text: chunk })
  state.text += chunk
}

// Sequential on purpose: proposals must be recorded in the order the model
// made them, and the isOpen check must see the latest state.
async function runTools(deps: CoachTurnDeps, toolUses: BetaToolUseBlock[], state: TurnState) {
  const results: BetaToolResultBlockParam[] = []
  for (const toolUse of toolUses) results.push(await runTool(deps, toolUse, state.proposals))
  return results
}

export async function runCoachTurn(deps: CoachTurnDeps, messages: BetaMessageParam[]): Promise<CoachTurnResult> {
  const conversation = [...messages]
  const state: TurnState = { text: '', proposals: [] }
  const finish = (rounds: number, incomplete = false): CoachTurnResult => ({ ...state, rounds, incomplete })

  for (let round = 1; round <= MAX_TOOL_ROUNDS; round++) {
    let message: Awaited<ReturnType<typeof callModel>>
    try {
      message = await callModel(deps, conversation, state)
    } catch (error: unknown) {
      // With nothing shown yet, the route reports the error. Later, the
      // lifter has seen text and proposal cards, so keep them and save.
      if (round === 1) throw error
      console.error(`Coach model call failed in round ${round}:`, error)
      return finish(round, true)
    }

    if (message.stop_reason === 'refusal') {
      appendRefusal(deps, state)
      return finish(round)
    }
    const toolUses = toolUsesIn(message.content)
    if (message.stop_reason !== 'tool_use' || toolUses.length === 0) return finish(round)

    // Last round: the text may already describe its proposal cards, so they
    // are still recorded. Lookups are skipped; no later round would read them.
    if (round === MAX_TOOL_ROUNDS) {
      await runTools(deps, toolUses.filter(toolUse => isProposeTool(toolUse.name)), state)
      return finish(round)
    }

    const results = await runTools(deps, toolUses, state)
    conversation.push({ role: 'assistant', content: message.content }, { role: 'user', content: results })
  }

  return finish(MAX_TOOL_ROUNDS)
}
