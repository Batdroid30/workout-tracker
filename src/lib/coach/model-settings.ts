import type { BetaRawMessageStreamEvent, MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/beta/messages/messages'

const HAIKU_MODEL = 'claude-haiku-5-5'
const DEFAULT_SONNET_MODEL = 'claude-sonnet-5-5'

export type ModelSettings = Pick<MessageCreateParamsBase, 'model' | 'max_tokens' | 'output_config' | 'betas' | 'fallbacks'>

// Haiku answers quick questions cheaply; Sonnet does routine and split work.
// Token caps leave room for a full split proposal. Only Sonnet has a
// server-side fallback model to retry on when it declines.
export function modelSettings(isComplexQuery: boolean): ModelSettings {
  if (!isComplexQuery) {
    return { model: HAIKU_MODEL, max_tokens: 4000, output_config: { effort: 'low' } }
  }
  return {
    model: process.env.ANTHROPIC_MODEL || DEFAULT_SONNET_MODEL,
    max_tokens: 16000,
    output_config: { effort: 'medium' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  }
}

export async function* textDeltas(events: AsyncIterable<BetaRawMessageStreamEvent>): AsyncGenerator<string> {
  for await (const event of events) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') yield event.delta.text
  }
}
