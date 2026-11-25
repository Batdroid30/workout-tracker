'use client'

import { useState } from 'react'
import { applyCoachProposalAction, dismissCoachProposalAction } from '@/app/(app)/coach/proposal-actions'
import { CoachProposalCard, type ProposalCardState } from './CoachProposalCard'
import type { CoachProposal } from '@/lib/coach/proposals'

export type ProposalStatus = CoachProposal['status']

interface CoachProposalsProps {
  messageId: string
  proposals: CoachProposal[]
  onStatusChange(proposalId: string, status: ProposalStatus): void
}

const TEMP_MESSAGE_PREFIX = 'temp-'
const RETRY_MESSAGE = 'Couldn\'t reach the server; try again.'

export function CoachProposals({ messageId, proposals, onStatusChange }: CoachProposalsProps) {
  const [cardStates, setCardStates] = useState<Record<string, ProposalCardState>>({})

  const setCardState = (proposalId: string, state: ProposalCardState) =>
    setCardStates(previous => ({ ...previous, [proposalId]: state }))

  // The server only knows the message under its real id, which arrives with
  // message_complete; until then a tap could not be matched to a saved proposal.
  const isMessageSaved = !messageId.startsWith(TEMP_MESSAGE_PREFIX)

  const confirm = async (proposalId: string) => {
    if (cardStates[proposalId] === 'working') return
    setCardState(proposalId, 'working')
    try {
      const result = await applyCoachProposalAction(messageId, proposalId)
      if (result.status === 'applied') {
        setCardState(proposalId, { done: result.href })
        onStatusChange(proposalId, 'applied')
      } else if (result.status === 'already_applied') {
        setCardState(proposalId, { done: '' })
        onStatusChange(proposalId, 'applied')
      } else if (result.status === 'stale') {
        setCardState(proposalId, { stale: result.message })
      } else {
        setCardState(proposalId, { failed: result.message })
      }
    } catch (error: unknown) {
      console.error('Confirming a coach proposal failed:', error)
      setCardState(proposalId, { failed: RETRY_MESSAGE })
    }
  }

  const dismiss = async (proposalId: string) => {
    if (cardStates[proposalId] === 'working') return
    setCardState(proposalId, 'working')
    try {
      const result = await dismissCoachProposalAction(messageId, proposalId)
      if (result.ok) {
        setCardState(proposalId, 'idle')
        onStatusChange(proposalId, 'dismissed')
      } else {
        setCardState(proposalId, { failed: result.error })
      }
    } catch (error: unknown) {
      console.error('Dismissing a coach proposal failed:', error)
      setCardState(proposalId, { failed: RETRY_MESSAGE })
    }
  }

  return (
    <>
      {proposals.map(proposal => (
        <CoachProposalCard
          key={proposal.id}
          proposal={proposal}
          state={resolveState(proposal, cardStates[proposal.id], isMessageSaved)}
          onConfirm={() => confirm(proposal.id)}
          onDismiss={() => dismiss(proposal.id)}
        />
      ))}
    </>
  )
}

function resolveState(
  proposal: CoachProposal,
  local: ProposalCardState | undefined,
  isMessageSaved: boolean,
): ProposalCardState {
  if (local && typeof local === 'object' && 'done' in local) return local
  if (proposal.status === 'applied') return { done: '' }
  if (!isMessageSaved) return 'working'
  return local ?? 'idle'
}
