import type { CoachStreamEvent } from '@/types/coach'

const DATA_PREFIX = 'data: '

export interface SseLineReader {
  push(chunk: string): CoachStreamEvent[]
  flush(): CoachStreamEvent[]
}

function parseDataLine(line: string): CoachStreamEvent | null {
  if (!line.startsWith(DATA_PREFIX)) return null
  const rawData = line.slice(DATA_PREFIX.length).trim()
  if (!rawData) return null
  try {
    return JSON.parse(rawData) as CoachStreamEvent
  } catch (parseError: unknown) {
    console.warn('Failed to parse SSE event:', parseError)
    return null
  }
}

function parseLines(lines: string[]): CoachStreamEvent[] {
  return lines.map(parseDataLine).filter((event): event is CoachStreamEvent => event !== null)
}

// A network chunk can end mid-line (proposal payloads are several KB), so the
// unterminated tail is held back until the next chunk completes it.
export function createSseLineReader(): SseLineReader {
  let buffer = ''
  return {
    push(chunk) {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      return parseLines(lines)
    },
    flush() {
      const remaining = buffer
      buffer = ''
      return parseLines([remaining])
    },
  }
}
