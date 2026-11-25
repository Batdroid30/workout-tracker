import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CoachMessageBubble } from './CoachMessageBubble'
import { CoachRoutineCard } from './CoachRoutineCard'
import { CoachChatTopBar } from './CoachChatTopBar'
import { CoachInput } from './CoachInput'
import type { CoachMessage } from '@/types/coach'

const message = (role: 'user' | 'assistant', content: string): CoachMessage => ({
  id: `${role}-1`,
  conversation_id: 'c1',
  role,
  content,
  metadata: null,
  created_at: '2026-11-25T10:00:00Z',
} as CoachMessage)

const noop = () => {}

describe('Coach chat', () => {
  it('puts the lifter in a soft bubble and the coach in plain text', () => {
    const mine = renderToStaticMarkup(<CoachMessageBubble message={message('user', 'Why has my bench stalled?')} />)
    const coach = renderToStaticMarkup(<CoachMessageBubble message={message('assistant', 'Three weeks flat.')} />)
    expect(mine).toContain('bg-surface-raised')
    expect(coach).not.toContain('bg-surface-raised')
    expect(coach).toContain('Three weeks flat.')
  })

  it('shows a saved routine with a link to Routines', () => {
    const markup = renderToStaticMarkup(
      <CoachRoutineCard routine={{ title: 'Push: bench block', exercises: [{ exercise_name: 'Bench press', target_sets: 3, target_reps: 5 }] }} savedRoutineId="r1" />,
    )
    expect(markup).toContain('Push: bench block')
    expect(markup).toContain('Saved')
    expect(markup).toContain('href="/routines"')
  })

  it('lets the lifter go back to the notes or start over from the top bar', () => {
    const markup = renderToStaticMarkup(<CoachChatTopBar title="Bench press stall" onBack={noop} onNewChat={noop} />)
    expect(markup).toContain('aria-label="Back to notes"')
    expect(markup).toContain('aria-label="New chat"')
    expect(markup).toContain('size-11')
    expect(markup).toContain('Bench press stall')
  })

  it('asks plainly in the chat box', () => {
    expect(renderToStaticMarkup(<CoachInput onSend={noop} />)).toContain('placeholder="Ask your coach…"')
  })
})
