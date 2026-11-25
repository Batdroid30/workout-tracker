import { createStreamSender } from '@/lib/coach/stream-sender'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { getSupabaseServer } from '@/lib/supabase/server'
import { checkCoachRateLimit } from '@/lib/coach/rate-limiter'
import { buildUserTrainingContext, buildCompactContext, isComplexQuery } from '@/lib/coach/context'
import { getCachedContext, setCachedContext } from '@/lib/coach/context-cache'
import { buildFullSystemPrompt } from '@/lib/coach/system-prompt'
import { COACH_TOOLS } from '@/lib/coach/tools'
import { createCoachToolExecutor } from '@/lib/coach/tool-executor'
import { runCoachTurn, type CoachTurnDeps, type ToolOutcome } from '@/lib/coach/coach-turn'
import { modelSettings, textDeltas } from '@/lib/coach/model-settings'
import {
  createConversation,
  getConversationById,
  getConversationMessages,
  saveCoachMessage,
  recordCoachUsage,
} from '@/lib/data/coach'
import type { CoachMessageMetadata, CoachStreamEvent } from '@/types/coach'

const ChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(3000),
})

const ToolInputRecordSchema = z.record(z.string(), z.unknown())

const EMPTY_REPLY_WITH_PROPOSALS = 'Here is what I propose.'
const EMPTY_REPLY = 'I could not finish that answer. Ask again.'

type ToolInvocation = NonNullable<CoachMessageMetadata['tool_invocations']>[number]
type TokenUsage = { input: number; output: number }

// Each model call is one round of the tool loop; usage adds up across rounds.
function createModelCaller(
  anthropic: Anthropic,
  complexQuery: boolean,
  systemPrompt: string,
  usage: TokenUsage,
): CoachTurnDeps['createMessage'] {
  return messages => {
    const stream = anthropic.beta.messages.stream({
      ...modelSettings(complexQuery),
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      tools: COACH_TOOLS,
      messages,
    })
    return {
      [Symbol.asyncIterator]: () => textDeltas(stream),
      final: async () => {
        const message = await stream.finalMessage()
        usage.input += message.usage.input_tokens
        usage.output += message.usage.output_tokens
        return message
      },
    }
  }
}

// Keeps a compact record of each tool call for the saved message; read tool
// results are left out because they can be long and are re-fetched on demand.
function loggingExecutor(
  execute: CoachTurnDeps['executeTool'],
  log: ToolInvocation[],
): CoachTurnDeps['executeTool'] {
  return async (name, input): Promise<ToolOutcome> => {
    const outcome = await execute(name, input)
    const parsedInput = ToolInputRecordSchema.safeParse(input)
    log.push({
      name,
      input: parsedInput.success ? parsedInput.data : {},
      result: {
        is_error: outcome.isError ?? false,
        proposal_id: outcome.proposal?.id,
        error: outcome.isError ? outcome.forModel : undefined,
      },
    })
    return outcome
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const parseResult = ChatRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: 'Invalid input', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { message, conversationId: requestedConvId } = parseResult.data

    // Check rate limit
    const rateLimit = await checkCoachRateLimit(user.id)
    if (!rateLimit.allowed) {
      return Response.json(
        { error: 'Daily message limit reached (10 messages/day). Resets at midnight.' },
        { status: 429 }
      )
    }

    // Resolve or create conversation
    let convId = requestedConvId
    if (convId) {
      const existing = await getConversationById(convId, user.id)
      if (!existing) convId = undefined
    }

    if (!convId) {
      const title = message.length > 35 ? `${message.slice(0, 32)}...` : message
      const newConv = await createConversation(user.id, title)
      convId = newConv.id
    }

    // Save incoming user message
    await saveCoachMessage({
      conversationId: convId,
      role: 'user',
      content: message,
    })

    const encoder = new TextEncoder()

    // Helper to send SSE events
    const sseEvent = (event: CoachStreamEvent) => {
      return encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
    }

    // Check if Anthropic API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY

    const stream = new ReadableStream({
      async start(controller) {
        const sender = createStreamSender(controller)
        if (!apiKey) {
          // Graceful stub mode when API key is not yet set
          const stubText =
            `**AI Coach is ready!** 🏋️\n\n` +
            `Your training data, routines, and workout analytics have been wired up successfully. ` +
            `To enable live AI responses and custom routine generation, please add your \`ANTHROPIC_API_KEY\` to your \`.env.local\` file.`

          sender.send(sseEvent({ type: 'text_delta', text: stubText }))

          const saved = await saveCoachMessage({
            conversationId: convId,
            role: 'assistant',
            content: stubText,
          })

          sender.send(
            sseEvent({
              type: 'message_complete',
              message_id: saved.id,
              conversation_id: convId,
            })
          )
          sender.close()
          return
        }

        try {
          const anthropic = new Anthropic({ apiKey })

          const complexQuery = isComplexQuery(message)

          // Use cached training context if fresh (avoids 10+ DB queries per message).
          // Complex queries always get fresh full context (routines section needed).
          const cachedCtx = complexQuery ? null : getCachedContext(user.id)
          const buildContext = complexQuery
            ? buildUserTrainingContext
            : buildCompactContext

          // Fetch past messages & training context in parallel
          const [pastMessages, dynamicContext] = await Promise.all([
            getConversationMessages(convId, 8),
            cachedCtx
              ? Promise.resolve(cachedCtx)
              : buildContext(user.id).then(ctx => {
                  setCachedContext(user.id, ctx)
                  return ctx
                }),
          ])

          const systemPrompt = buildFullSystemPrompt(dynamicContext)

          // Format previous messages for Claude API (cap at 6 to control token spend)
          const messagesForClaude: BetaMessageParam[] = pastMessages.slice(-6).map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          }))

          // Ensure current user message is at the end
          if (
            messagesForClaude.length === 0 ||
            messagesForClaude[messagesForClaude.length - 1].content !== message
          ) {
            messagesForClaude.push({ role: 'user', content: message })
          }

          const usage: TokenUsage = { input: 0, output: 0 }
          const toolInvocations: ToolInvocation[] = []

          // Lookups and proposals run in a loop with the model; proposals are
          // only recorded while the lifter is connected (see runCoachTurn).
          const { text, proposals } = await runCoachTurn(
            {
              createMessage: createModelCaller(anthropic, complexQuery, systemPrompt, usage),
              executeTool: loggingExecutor(createCoachToolExecutor(user.id), toolInvocations),
              send: event => sender.send(sseEvent(event)),
              isOpen: () => sender.isOpen,
            },
            messagesForClaude,
          )

          // Saved once at the end, so a lifter who left still finds the reply.
          const savedMessage = await saveCoachMessage({
            conversationId: convId,
            role: 'assistant',
            content: text || (proposals.length > 0 ? EMPTY_REPLY_WITH_PROPOSALS : EMPTY_REPLY),
            metadata: {
              proposals: proposals.length > 0 ? proposals : undefined,
              tool_invocations: toolInvocations.length > 0 ? toolInvocations : undefined,
              tokens_in: usage.input,
              tokens_out: usage.output,
            },
          })

          // Track usage asynchronously
          recordCoachUsage(user.id, usage.input, usage.output).catch(() => {})

          sender.send(
            sseEvent({
              type: 'message_complete',
              message_id: savedMessage.id,
              conversation_id: convId,
            })
          )
        } catch (streamError) {
          console.error('Claude streaming error:', streamError)
          sender.send(
            sseEvent({
              type: 'error',
              message: 'Failed to generate coach response. Please try again.',
            })
          )
        } finally {
          sender.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (error: unknown) {
    console.error('Error in /api/coach/chat:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
