import Link from 'next/link'
import { Button, Card } from '@/components/ui'
import { CoachProposalBody } from './CoachProposalBody'
import type { CoachProposal } from '@/lib/coach/proposals'

export type ProposalCardState =
  | 'idle'
  | 'working'
  | { stale: string }
  | { failed: string }
  | { done: string }

interface CoachProposalCardProps {
  proposal: CoachProposal
  state: ProposalCardState
  onConfirm(): void
  onDismiss(): void
}

function viewTarget(proposal: CoachProposal): string {
  switch (proposal.kind) {
    case 'swap':
    case 'reorder':      return proposal.routine_title
    case 'new_exercise': return proposal.add_to?.routine_title ?? 'Exercises'
    case 'routine':      return proposal.title
    case 'split':        return proposal.name
  }
}

function problemMessage(state: ProposalCardState): string | null {
  if (typeof state === 'string') return null
  if ('stale' in state) return state.stale
  if ('failed' in state) return state.failed
  return null
}

// An empty href means the change is known to be applied (reloaded chat) but
// where to view it isn't, so the card shows Done without a link.
function DoneLine({ proposal, href }: { proposal: CoachProposal; href: string }) {
  return (
    <p className="t-body-sm mt-3 text-positive">
      ✓ Done
      {href && (
        <>
          {' · '}
          <Link href={href} className="text-secondary">View {viewTarget(proposal)} ›</Link>
        </>
      )}
    </p>
  )
}

interface ActionsProps {
  isWorking: boolean
  onConfirm(): void
  onDismiss(): void
}

function Actions({ isWorking, onConfirm, onDismiss }: ActionsProps) {
  return (
    <div className="mt-3.5 flex gap-2.5">
      <Button variant="secondary" disabled={isWorking} onClick={onDismiss}>Not now</Button>
      <Button variant="primary" disabled={isWorking} loading={isWorking} onClick={onConfirm}>Confirm</Button>
    </div>
  )
}

export function CoachProposalCard({ proposal, state, onConfirm, onDismiss }: CoachProposalCardProps) {
  const doneHref = typeof state === 'object' && 'done' in state ? state.done : null
  const isDone = doneHref !== null
  const problem = problemMessage(state)

  return (
    <Card className="mt-3">
      <span className="t-label uppercase tracking-wide text-tertiary">{proposal.label}</span>
      <CoachProposalBody proposal={proposal} />

      {isDone && <DoneLine proposal={proposal} href={doneHref} />}
      {proposal.status === 'dismissed' && <p className="t-body-sm mt-3 text-tertiary">Not applied</p>}
      {problem && <p className="t-caption mt-3 text-caution" role="alert">{problem}</p>}
      {proposal.status === 'pending' && !isDone && (
        <Actions isWorking={state === 'working'} onConfirm={onConfirm} onDismiss={onDismiss} />
      )}
    </Card>
  )
}
