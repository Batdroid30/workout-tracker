import { createStreamSender } from '@/lib/coach/stream-sender'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseServer } from '@/lib/supabase/server'
import { checkCoachRateLimit } from '@/lib/coach/rate-limiter'
import { buildUserTrainingContext, buildCompactContext, isComplexQuery } from '@/lib/coach/context'
import { getCachedContext, setCachedContext } from '@/lib/coach/context-cache'
import { buildFullSystemPrompt } from '@/lib/coach/system-prompt'
import { COACH_TOOLS } from '@/lib/coach/tools'
import { executeCoachTool, type ToolExecutionResult } from '@/lib/coach/tool-executor'
import {
  createConversation,
  getConversationById,
  getConversationMessages,
  saveCoachMessage,
  recordCoachUsage,
} from '@/lib/data/coach'
import type { CoachStreamEvent, ProposedRoutine } from '@/types/coach'

/**
 * Haiku is ~8× cheaper than Sonnet and handles quick Q&A perfectly.
 * Sonnet is reserved for complex tasks: routine creation, programming, periodisation.
 */
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const SONNET_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

const ChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(3000),
})

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

          // Route to cheaper Haiku for simple Q&A, Sonnet only for complex tasks.
          // Haiku is ~8× cheaper and handles quick questions perfectly.
          const complexQuery = isComplexQuery(message)
          const modelName = complexQuery ? SONNET_MODEL : HAIKU_MODEL
          const maxTokens = complexQuery ? 1200 : 600

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
          const messagesForClaude: Array<{
            role: 'user' | 'assistant'
            content: string
          }> = pastMessages.slice(-6).map(m => ({
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

          let fullContent = ''
          let proposedRoutine: ProposedRoutine | undefined
          let savedRoutineId: string | undefined
          const toolInvocations: Array<{ name: string; input: Record<string, unknown>; result?: unknown }> = []

          // Stream from Claude with prompt caching on the system prompt
          // (cache_control: ephemeral gives 90% discount on repeated system tokens)
          const claudeStream = anthropic.messages.stream({
            model: modelName,
            max_tokens: maxTokens,
            system: [
              {
                type: 'text',
                text: systemPrompt,
                cache_control: { type: 'ephemeral' },
              },
            ],
            messages: messagesForClaude,
            tools: COACH_TOOLS,
          })

          for await (const chunk of claudeStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              fullContent += chunk.delta.text
              sender.send(
                sseEvent({ type: 'text_delta', text: chunk.delta.text })
              )
            }
          }

          const finalMessage = await claudeStream.finalMessage()

          // Check if Claude requested any tool calls
          for (const block of finalMessage.content) {
            if (block.type === 'tool_use') {
              const toolResult: ToolExecutionResult = await executeCoachTool(
                block.name,
                block.input as Record<string, unknown>,
                user.id
              )

              toolInvocations.push({
                name: block.name,
                input: block.input as Record<string, unknown>,
                result: toolResult,
              })

              if (toolResult.proposed_routine) {
                proposedRoutine = toolResult.proposed_routine
                savedRoutineId = toolResult.saved_routine_id

                sender.send(
                  sseEvent({
                    type: 'routine_proposed',
                    routine: toolResult.proposed_routine,
                  })
                )
              }

              sender.send(
                sseEvent({
                  type: 'tool_result',
                  tool: block.name,
                  result: toolResult,
                })
              )
            }
          }

          // Save assistant message with metadata
          const savedMessage = await saveCoachMessage({
            conversationId: convId,
            role: 'assistant',
            content: fullContent || 'Routine created and added to your training plan.',
            metadata: {
              proposed_routine: proposedRoutine,
              saved_routine_id: savedRoutineId,
              tool_invocations: toolInvocations.length > 0 ? toolInvocations : undefined,
              tokens_in: finalMessage.usage.input_tokens,
              tokens_out: finalMessage.usage.output_tokens,
            },
          })

          // Track usage asynchronously
          recordCoachUsage(
            user.id,
            finalMessage.usage.input_tokens,
            finalMessage.usage.output_tokens
          ).catch(() => {})

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
