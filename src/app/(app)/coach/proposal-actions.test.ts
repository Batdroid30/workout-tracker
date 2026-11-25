import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CoachProposal } from '@/lib/coach/proposals'

vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/cache', () => ({ revalidateAll: vi.fn() }))
vi.mock('@/lib/data/coach', () => ({ getMessageProposal: vi.fn(), updateMessageProposal: vi.fn() }))
vi.mock('@/lib/coach/apply-deps', () => ({ buildApplyDeps: vi.fn(() => ({})) }))
vi.mock('@/lib/coach/apply-proposal', () => ({ applyProposal: vi.fn() }))

import { requireAuth } from '@/lib/auth'
import { revalidateAll } from '@/lib/cache'
import { getMessageProposal, updateMessageProposal } from '@/lib/data/coach'
import { buildApplyDeps } from '@/lib/coach/apply-deps'
import { applyProposal } from '@/lib/coach/apply-proposal'
import { applyCoachProposalAction, dismissCoachProposalAction } from './proposal-actions'

const USER_ID = 'user-1'

const PROPOSAL: CoachProposal = {
  id: 'p-1',
  status: 'pending',
  label: 'New routine',
  kind: 'routine',
  title: 'Legs',
  notes: null,
  exercises: [{ name: 'Back Squat', exercise_id: 'squat', target_sets: 5, target_reps: 5 }],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(requireAuth).mockResolvedValue({ session: { user: { id: USER_ID } }, userId: USER_ID } as Awaited<ReturnType<typeof requireAuth>>)
  vi.mocked(getMessageProposal).mockResolvedValue(PROPOSAL)
  vi.mocked(updateMessageProposal).mockResolvedValue()
})

describe('applyCoachProposalAction', () => {
  it('lets the login redirect through before reading anything', async () => {
    const redirectToLogin = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/login;307;' })
    vi.mocked(requireAuth).mockRejectedValueOnce(redirectToLogin)

    await expect(applyCoachProposalAction('m-1', 'p-1')).rejects.toBe(redirectToLogin)
    expect(getMessageProposal).not.toHaveBeenCalled()
  })

  it('reads the proposal as the caller and applies it with the caller\'s deps', async () => {
    vi.mocked(applyProposal).mockResolvedValue({ status: 'applied', href: '/routines/r-1/edit' })

    const result = await applyCoachProposalAction('m-1', 'p-1')

    expect(getMessageProposal).toHaveBeenCalledWith('m-1', USER_ID, 'p-1')
    expect(buildApplyDeps).toHaveBeenCalledWith(USER_ID)
    expect(result).toEqual({ status: 'applied', href: '/routines/r-1/edit' })
  })

  it('marks the proposal applied and revalidates after a successful apply', async () => {
    vi.mocked(applyProposal).mockResolvedValue({ status: 'applied', href: '/routines/r-1/edit' })

    await applyCoachProposalAction('m-1', 'p-1')

    expect(updateMessageProposal).toHaveBeenCalledWith('m-1', USER_ID, { ...PROPOSAL, status: 'applied' })
    expect(revalidateAll).toHaveBeenCalled()
  })

  it('still reports applied when only the status write fails, so the lifter does not confirm again', async () => {
    vi.mocked(applyProposal).mockResolvedValue({ status: 'applied', href: '/routines/r-1/edit' })
    vi.mocked(updateMessageProposal).mockRejectedValueOnce(new Error('db down'))

    const result = await applyCoachProposalAction('m-1', 'p-1')

    expect(result).toEqual({ status: 'applied', href: '/routines/r-1/edit' })
    expect(revalidateAll).toHaveBeenCalled()
  })

  it.each([
    { status: 'stale' as const, message: 'Legs changed since; ask again.' },
    { status: 'failed' as const, message: 'Couldn\'t create Legs; try again.' },
    { status: 'already_applied' as const },
  ])('leaves the stored status alone when the result is $status', async result => {
    vi.mocked(applyProposal).mockResolvedValue(result)

    expect(await applyCoachProposalAction('m-1', 'p-1')).toEqual(result)
    expect(updateMessageProposal).not.toHaveBeenCalled()
  })

  it('fails without applying when the message is not the caller\'s', async () => {
    vi.mocked(getMessageProposal).mockResolvedValue(null)

    const result = await applyCoachProposalAction('m-1', 'p-1')

    expect(result.status).toBe('failed')
    expect(applyProposal).not.toHaveBeenCalled()
  })
})

describe('dismissCoachProposalAction', () => {
  it('marks a pending proposal dismissed', async () => {
    expect(await dismissCoachProposalAction('m-1', 'p-1')).toEqual({ ok: true })
    expect(updateMessageProposal).toHaveBeenCalledWith('m-1', USER_ID, { ...PROPOSAL, status: 'dismissed' })
  })

  it('never dismisses an applied proposal', async () => {
    vi.mocked(getMessageProposal).mockResolvedValue({ ...PROPOSAL, status: 'applied' })

    expect(await dismissCoachProposalAction('m-1', 'p-1')).toEqual({ ok: false, error: 'Already applied.' })
    expect(updateMessageProposal).not.toHaveBeenCalled()
  })

  it('refuses a message that is not the caller\'s', async () => {
    vi.mocked(getMessageProposal).mockResolvedValue(null)

    expect((await dismissCoachProposalAction('m-1', 'p-1')).ok).toBe(false)
    expect(updateMessageProposal).not.toHaveBeenCalled()
  })
})
