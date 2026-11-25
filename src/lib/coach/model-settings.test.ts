import { describe, it, expect, afterEach } from 'vitest'
import type { BetaRawMessageStreamEvent } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { modelSettings, textDeltas } from './model-settings'

describe('modelSettings', () => {
  const originalModel = process.env.ANTHROPIC_MODEL
  afterEach(() => {
    if (originalModel === undefined) delete process.env.ANTHROPIC_MODEL
    else process.env.ANTHROPIC_MODEL = originalModel
  })

  it('sends quick questions to Haiku at low effort, without fallbacks', () => {
    delete process.env.ANTHROPIC_MODEL
    expect(modelSettings(false)).toEqual({
      model: 'claude-haiku-5-5',
      max_tokens: 4000,
      output_config: { effort: 'low' },
    })
  })

  it('sends routine work to Sonnet at medium effort with the server-side refusal fallback', () => {
    delete process.env.ANTHROPIC_MODEL
    expect(modelSettings(true)).toEqual({
      model: 'claude-sonnet-5-5',
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    })
  })

  it('drops the fallback and its beta when ANTHROPIC_MODEL names an older model', () => {
    process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-6'
    expect(modelSettings(true)).toEqual({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      output_config: { effort: 'medium' },
    })
  })

  it('lets ANTHROPIC_MODEL override the Sonnet model', () => {
    process.env.ANTHROPIC_MODEL = 'claude-sonnet-5'
    expect(modelSettings(true).model).toBe('claude-sonnet-5')
    expect(modelSettings(false).model).toBe('claude-haiku-5-5')
  })
})

describe('textDeltas', () => {
  it('yields only the text of text deltas', async () => {
    async function* events(): AsyncGenerator<BetaRawMessageStreamEvent> {
      yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hold ' } }
      yield { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"q"' } }
      yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'the pause.' } }
      yield { type: 'message_stop' }
    }

    const texts: string[] = []
    for await (const text of textDeltas(events())) texts.push(text)

    expect(texts).toEqual(['Hold ', 'the pause.'])
  })
})
