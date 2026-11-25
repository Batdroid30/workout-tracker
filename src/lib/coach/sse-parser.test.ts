import { describe, it, expect, vi } from 'vitest'
import { createSseLineReader } from './sse-parser'

const line = (event: object) => `data: ${JSON.stringify(event)}\n\n`

describe('createSseLineReader', () => {
  it('yields two events from one chunk', () => {
    const reader = createSseLineReader()
    const events = reader.push(line({ type: 'text_delta', text: 'a' }) + line({ type: 'text_delta', text: 'b' }))
    expect(events).toEqual([
      { type: 'text_delta', text: 'a' },
      { type: 'text_delta', text: 'b' },
    ])
  })

  it('yields exactly one event when it is split across two chunks', () => {
    const reader = createSseLineReader()
    const full = line({ type: 'text_delta', text: 'hello world' })
    const cut = 20
    expect(reader.push(full.slice(0, cut))).toEqual([])
    expect(reader.push(full.slice(cut))).toEqual([{ type: 'text_delta', text: 'hello world' }])
  })

  it('holds a trailing partial line until the next chunk completes it', () => {
    const reader = createSseLineReader()
    const first = line({ type: 'text_delta', text: 'a' })
    const second = line({ type: 'text_delta', text: 'b' })
    expect(reader.push(first + second.slice(0, 10))).toEqual([{ type: 'text_delta', text: 'a' }])
    expect(reader.push(second.slice(10))).toEqual([{ type: 'text_delta', text: 'b' }])
  })

  it('flush parses a final line that has no trailing newline', () => {
    const reader = createSseLineReader()
    expect(reader.push('data: {"type":"text_delta","text":"z"}')).toEqual([])
    expect(reader.flush()).toEqual([{ type: 'text_delta', text: 'z' }])
    expect(reader.flush()).toEqual([])
  })

  it('skips malformed and non-data lines', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const reader = createSseLineReader()
    const events = reader.push('data: {not json\n: comment\ndata: \n' + line({ type: 'text_delta', text: 'ok' }))
    expect(events).toEqual([{ type: 'text_delta', text: 'ok' }])
    warn.mockRestore()
  })
})
