import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CoachProposalCard } from './CoachProposalCard'
import { CoachProposals } from './CoachProposals'
import { CoachMessageBubble } from './CoachMessageBubble'
import type { CoachProposal } from '@/lib/coach/proposals'
import type { CoachMessage } from '@/types/coach'

vi.mock('@/app/(app)/coach/proposal-actions', () => ({
  applyCoachProposalAction: vi.fn(),
  dismissCoachProposalAction: vi.fn(),
}))

const noop = () => {}

const swap: CoachProposal = {
  id: 'p1', status: 'pending', label: 'Swap in Push', kind: 'swap',
  routine_id: 'r1', routine_title: 'Push', position: 0,
  old_exercise_id: 'e1', old_name: 'Tricep Pushdown', new_exercise_id: 'e2', new_name: 'Overhead Cable Extension',
  target_sets: 3, target_reps: 10, reason: 'Same slot, longer stretch.', stamp: [],
}

const reorder: CoachProposal = {
  id: 'p2', status: 'pending', label: 'Reorder Push', kind: 'reorder',
  routine_id: 'r1', routine_title: 'Push',
  before: ['Tricep Pushdown', 'Lateral Raise', 'Bench Press'],
  after: ['Bench Press', 'Tricep Pushdown', 'Lateral Raise'],
  new_order_exercise_ids: ['e3', 'e1', 'e4'], reason: 'Heavy first.', stamp: [],
}

const routine: CoachProposal = {
  id: 'p3', status: 'pending', label: 'New routine', kind: 'routine', title: 'Posterior day', notes: null,
  exercises: [
    { name: 'Deadlift', exercise_id: 'e9', target_sets: 3, target_reps: 5 },
    {
      name: 'Jefferson Curl', target_sets: 3, target_reps: 8,
      new_exercise: { name: 'Jefferson Curl', muscle_group: 'hamstrings', secondary_muscles: [], equipment: 'Barbell', movement_pattern: 'hinge' },
    },
  ],
}

const newExercise: CoachProposal = {
  id: 'p4', status: 'pending', label: 'New exercise · add to Legs', kind: 'new_exercise',
  exercise: { name: 'Jefferson Curl', muscle_group: 'hamstrings', secondary_muscles: [], equipment: 'Barbell', movement_pattern: 'hinge' },
  add_to: { routine_id: 'r2', routine_title: 'Legs', target_sets: 3, target_reps: 8, stamp: [] },
}

const render = (proposal: CoachProposal, state: Parameters<typeof CoachProposalCard>[0]['state'] = 'idle') =>
  renderToStaticMarkup(<CoachProposalCard proposal={proposal} state={state} onConfirm={noop} onDismiss={noop} />)

describe('CoachProposalCard', () => {
  it('shows a pending swap with the old name crossed out and both buttons', () => {
    const markup = render(swap)
    expect(markup).toContain('Swap in Push')
    expect(markup).toMatch(/line-through[^>]*>Tricep Pushdown/)
    expect(markup).toContain('Overhead Cable Extension')
    expect(markup).toContain('Same slot, longer stretch.')
    expect(markup).toContain('Not now')
    expect(markup).toContain('Confirm')
  })

  it('shows a reorder as Now and After lists with moved names bold', () => {
    const markup = render(reorder)
    expect(markup).toContain('Now')
    expect(markup).toContain('After')
    expect(markup).toMatch(/font-semibold[^>]*>Bench Press/)
    expect(markup).not.toMatch(/font-semibold[^>]*>Lateral Raise/)
  })

  it('lists a new exercise inside a routine as + New', () => {
    expect(render(routine)).toContain('+ New: Jefferson Curl')
  })

  it('describes a new exercise and says it joins the library', () => {
    const markup = render(newExercise)
    expect(markup).toContain('Jefferson Curl')
    expect(markup).toContain('Added to your library as yours')
  })

  it('turns into Done with a link, and no buttons, once applied', () => {
    const markup = render(swap, { done: '/routines/r1' })
    expect(markup).toContain('✓ Done')
    expect(markup).toContain('href="/routines/r1"')
    expect(markup).toContain('View Push')
    expect(markup).not.toContain('Confirm')
  })

  it('shows the stale message and keeps the buttons', () => {
    const markup = render(swap, { stale: 'Push changed since; ask again.' })
    expect(markup).toContain('Push changed since; ask again.')
    expect(markup).toContain('Confirm')
  })

  it('shows Not applied for a dismissed proposal, without buttons', () => {
    const markup = render({ ...swap, status: 'dismissed' })
    expect(markup).toContain('Not applied')
    expect(markup).not.toContain('Confirm')
  })

  it('disables both buttons with no spinner for an unsaved message', () => {
    const markup = render(swap, 'unsaved')
    expect(markup.match(/disabled=""/g)?.length).toBe(2)
    expect(markup).not.toContain('aria-busy')
  })

  it('disables both buttons while the request is in flight', () => {
    const markup = render(swap, 'working')
    expect(markup.match(/disabled=""/g)?.length).toBe(2)
    expect(markup).toContain('aria-busy')
  })
})

describe('CoachProposals', () => {
  it('disables the buttons, without a spinner, until the message has its real id', () => {
    const markup = renderToStaticMarkup(
      <CoachProposals messageId="temp-asst-1" proposals={[swap]} onStatusChange={noop} />,
    )
    expect(markup.match(/disabled=""/g)?.length).toBe(2)
    expect(markup).not.toContain('aria-busy')
    expect(markup).not.toContain('animate-spin')
  })

  it('enables the buttons once the message is saved', () => {
    const markup = renderToStaticMarkup(
      <CoachProposals messageId="m1" proposals={[swap]} onStatusChange={noop} />,
    )
    expect(markup).not.toContain('disabled=""')
  })
})

describe('CoachMessageBubble proposals', () => {
  const base: CoachMessage = {
    id: 'm1', conversation_id: 'c1', role: 'assistant', content: 'Try this.',
    metadata: null, created_at: '2026-11-25T10:00:00Z',
  }

  it('renders proposal cards from metadata', () => {
    const markup = renderToStaticMarkup(
      <CoachMessageBubble message={{ ...base, metadata: { proposals: [swap] } }} onProposalStatusChange={noop} />,
    )
    expect(markup).toContain('Swap in Push')
  })

  it('still renders the old routine card for messages with only proposed_routine', () => {
    const markup = renderToStaticMarkup(
      <CoachMessageBubble
        message={{ ...base, metadata: { proposed_routine: { title: 'Old plan', exercises: [] } } }}
        onProposalStatusChange={noop}
      />,
    )
    expect(markup).toContain('Old plan')
    expect(markup).toContain('View in Routines')
  })
})
