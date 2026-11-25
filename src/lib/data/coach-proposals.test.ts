import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CoachProposal } from '@/lib/coach/proposals'

vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer: vi.fn() }))

import { getSupabaseServer } from '@/lib/supabase/server'
import { getMessageProposal, updateMessageProposal } from './coach'

const OWNER = 'owner-1'

const routineProposal = (id: string): CoachProposal => ({
  id,
  status: 'pending',
  label: 'New routine',
  kind: 'routine',
  title: 'Legs',
  notes: null,
  exercises: [{ name: 'Back Squat', exercise_id: 'squat', target_sets: 5, target_reps: 5 }],
})

const MESSAGE = {
  id: 'message-1',
  conversation_id: 'conversation-1',
  metadata: { tokens_in: 10, proposals: [routineProposal('p-1'), routineProposal('p-2')] },
}

interface Update { table: string; payload: unknown; filters: Record<string, unknown> }

// A minimal stand-in for the Supabase query builder: filters are recorded and
// rows are returned only when they match, as RLS-free Postgres would.
function fakeSupabase() {
  const updates: Update[] = []
  const rowFor = (table: string, filters: Record<string, unknown>) => {
    if (table === 'coach_messages' && filters.id === MESSAGE.id) return MESSAGE
    if (table === 'coach_conversations' && filters.id === MESSAGE.conversation_id && filters.user_id === OWNER) {
      return { id: MESSAGE.conversation_id, user_id: OWNER, title: null, created_at: '', updated_at: '' }
    }
    return null
  }
  const from = (table: string) => {
    const filters: Record<string, unknown> = {}
    let pending: Update | null = null
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => { filters[column] = value; return builder },
      update: (payload: unknown) => { pending = { table, payload, filters }; return builder },
      maybeSingle: async () => ({ data: rowFor(table, filters), error: null }),
      then: (resolve: (value: { error: null }) => void) => {
        if (pending) updates.push(pending)
        resolve({ error: null })
      },
    }
    return builder
  }
  return { client: { from }, updates }
}

let fake: ReturnType<typeof fakeSupabase>

beforeEach(() => {
  fake = fakeSupabase()
  vi.mocked(getSupabaseServer).mockResolvedValue(fake.client as unknown as Awaited<ReturnType<typeof getSupabaseServer>>)
})

describe('getMessageProposal', () => {
  it('returns the proposal from the caller\'s own message', async () => {
    expect(await getMessageProposal('message-1', OWNER, 'p-2')).toEqual(routineProposal('p-2'))
  })

  it('returns null for a message in someone else\'s conversation', async () => {
    expect(await getMessageProposal('message-1', 'intruder', 'p-1')).toBeNull()
  })

  it('returns null for an unknown proposal id', async () => {
    expect(await getMessageProposal('message-1', OWNER, 'p-9')).toBeNull()
  })
})

describe('updateMessageProposal', () => {
  it('replaces only the proposal with that id and keeps the rest of the metadata', async () => {
    await updateMessageProposal('message-1', OWNER, { ...routineProposal('p-2'), status: 'applied' })

    expect(fake.updates).toHaveLength(1)
    expect(fake.updates[0]).toEqual({
      table: 'coach_messages',
      filters: { id: 'message-1' },
      payload: {
        metadata: {
          tokens_in: 10,
          proposals: [routineProposal('p-1'), { ...routineProposal('p-2'), status: 'applied' }],
        },
      },
    })
  })

  it('refuses, without writing, a message in someone else\'s conversation', async () => {
    await expect(updateMessageProposal('message-1', 'intruder', { ...routineProposal('p-1'), status: 'applied' }))
      .rejects.toThrow()
    expect(fake.updates).toHaveLength(0)
  })

  it('refuses, without writing, a proposal id the message does not hold', async () => {
    await expect(updateMessageProposal('message-1', OWNER, routineProposal('p-9'))).rejects.toThrow()
    expect(fake.updates).toHaveLength(0)
  })
})
