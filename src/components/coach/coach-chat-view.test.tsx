import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

import { CoachChatView } from './CoachChatView'

describe('CoachChatView', () => {
  it('goes straight into the chat for a deep link, never a false "nothing to note"', () => {
    const markup = renderToStaticMarkup(<CoachChatView initialPrompt="Why has my bench stalled?" />)
    expect(markup).not.toContain('Nothing needs attention')
    expect(markup).not.toContain('What I noticed')
    expect(markup).toContain('aria-label="Back to notes"')
    expect(markup).toContain('Why has my bench stalled?')
  })

  it('shows the notes only when they were loaded', () => {
    expect(renderToStaticMarkup(<CoachChatView notes={[]} recentChats={[]} />)).toContain('Nothing needs attention')
    expect(renderToStaticMarkup(<CoachChatView />)).not.toContain('Nothing needs attention')
  })
})
