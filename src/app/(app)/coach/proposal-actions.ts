'use server'

import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { revalidateAll } from '@/lib/cache'
import { applyProposal, type ApplyResult } from '@/lib/coach/apply-proposal'
import { buildApplyDeps } from '@/lib/coach/apply-deps'
import { getMessageProposal, updateMessageProposal } from '@/lib/data/coach'
import type { CoachProposal } from '@/lib/coach/proposals'

const ProposalRefSchema = z.object({
  messageId:  z.string().min(1).max(100),
  proposalId: z.string().min(1).max(100),
})

const NOT_FOUND = 'That suggestion is no longer available.'

// The data already changed, so a failed status write must not turn into a
// "failed" result: the lifter would tap Confirm again. A later tap on a swap or
// reorder comes back stale because the routine no longer matches its stamp.
async function markApplied(messageId: string, userId: string, proposal: CoachProposal): Promise<void> {
  try {
    await updateMessageProposal(messageId, userId, { ...proposal, status: 'applied' })
  } catch (error: unknown) {
    console.error(`Applied coach proposal ${proposal.id} but could not mark it applied:`, error)
  } finally {
    revalidateAll()
  }
}

export async function applyCoachProposalAction(messageId: string, proposalId: string): Promise<ApplyResult> {
  const { userId } = await requireAuth()
  if (!ProposalRefSchema.safeParse({ messageId, proposalId }).success) {
    return { status: 'failed', message: NOT_FOUND }
  }

  try {
    const proposal = await getMessageProposal(messageId, userId, proposalId)
    if (!proposal) return { status: 'failed', message: NOT_FOUND }

    const result = await applyProposal(proposal, buildApplyDeps(userId))
    if (result.status === 'applied') await markApplied(messageId, userId, proposal)
    return result
  } catch (error: unknown) {
    console.error(`Failed to apply coach proposal ${proposalId}:`, error)
    return { status: 'failed', message: 'Couldn\'t apply that; try again.' }
  }
}

export async function dismissCoachProposalAction(
  messageId: string,
  proposalId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await requireAuth()
  if (!ProposalRefSchema.safeParse({ messageId, proposalId }).success) {
    return { ok: false, error: NOT_FOUND }
  }

  try {
    const proposal = await getMessageProposal(messageId, userId, proposalId)
    if (!proposal) return { ok: false, error: NOT_FOUND }
    if (proposal.status === 'applied') return { ok: false, error: 'Already applied.' }
    if (proposal.status === 'dismissed') return { ok: true }

    await updateMessageProposal(messageId, userId, { ...proposal, status: 'dismissed' })
    revalidateAll()
    return { ok: true }
  } catch (error: unknown) {
    console.error(`Failed to dismiss coach proposal ${proposalId}:`, error)
    return { ok: false, error: 'Couldn\'t update that; try again.' }
  }
}
