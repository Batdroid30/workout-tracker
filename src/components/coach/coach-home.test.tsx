import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CoachHome, type RecentChat } from './CoachHome'
import type { CoachNote } from '@/lib/home'

const stalled: CoachNote = {
  kind: 'stalled_lift',
  title: 'Bench press has stalled',
  body: 'No real progress for three weeks.',
  href: '/exercises',
  cta: 'See options',
  prompt: 'My Bench press has stalled. What should I change?',
}

const noop = () => {}
const render = (notes: CoachNote[], recentChats: RecentChat[] = []) =>
  renderToStaticMarkup(<CoachHome notes={notes} recentChats={recentChats} onAsk={noop} onOpenHistory={noop} />)

describe('CoachHome', () => {
  it('leads with what the coach noticed, each with a way to ask and its usual action', () => {
    const markup = render([stalled])
    expect(markup).toContain('This week')
    expect(markup).toContain('What I noticed')
    expect(markup).toContain('Bench press has stalled')
    expect(markup).toContain('No real progress for three weeks.')
    expect(markup).toContain('Ask about this')
    expect(markup).toContain('href="/exercises"')
    expect(markup).toContain('See options')
  })

  it('says so when nothing needs attention', () => {
    expect(render([])).toContain('Nothing needs attention this week.')
  })

  it('shows up to three recent chats, untitled ones as "New chat"', () => {
    const chats: RecentChat[] = [
      { id: 'c1', title: 'Upper/lower split', when: 'Tue' },
      { id: 'c2', title: null, when: 'Mon' },
      { id: 'c3', title: 'Squat stuck', when: '12 Nov' },
      { id: 'c4', title: 'Too many', when: '1 Nov' },
    ]
    const markup = render([], chats)
    expect(markup).toContain('Recent chats')
    expect(markup).toContain('href="/coach/c1"')
    expect(markup).toContain('New chat')
    expect(markup).not.toContain('href="/coach/c4"')
    expect(markup).toContain('See all')
  })

  it('leaves out recent chats when there are none', () => {
    expect(render([stalled])).not.toContain('Recent chats')
  })

  it('drops the sales copy', () => {
    const markup = render([stalled])
    expect(markup).not.toContain('PRO')
    expect(markup).not.toContain('precision')
  })
})
