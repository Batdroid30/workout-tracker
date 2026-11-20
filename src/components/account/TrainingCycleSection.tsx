'use client'

import { useTransition } from 'react'
import { Button, SectionHeader } from '@/components/ui'
import { useDialog } from '@/providers/DialogProvider'
import { useToast } from '@/providers/ToastProvider'
import { runAction } from '@/lib/run-action'
import { restartCycleAction, restartPhaseAction } from '@/app/(app)/account/training-actions'
import type { TrainingCycle } from '@/lib/training-cycle'

interface TrainingCycleSectionProps {
  cycle: TrainingCycle
  hasPhase: boolean
}

export function TrainingCycleSection({ cycle, hasPhase }: TrainingCycleSectionProps) {
  const dialog = useDialog()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()

  const restartCycle = async () => {
    const confirmed = await dialog.confirm({
      title: 'Restart your cycle?',
      description: 'Your next training week starts as Strength week.',
      confirmText: 'Restart cycle',
    })
    if (confirmed) startTransition(async () => { await runAction(restartCycleAction, toast.error) })
  }

  const restartPhase = async () => {
    const confirmed = await dialog.confirm({
      title: 'Restart your phase?',
      description: "You'll be back to week 1, and your cycle restarts at Strength week.",
      confirmText: 'Restart phase',
    })
    if (confirmed) startTransition(async () => { await runAction(restartPhaseAction, toast.error) })
  }

  return (
    <section className="mt-10 pt-6 border-t border-border">
      <SectionHeader title="Training" />
      <p className="t-body mt-2">
        {cycle.scheme.label}{hasPhase ? ` · Phase week ${cycle.phaseWeek}` : ''}
      </p>
      <p className="t-caption mt-1">
        Weeks move on only when you train at least half your weekly goal.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" fullWidth={false} disabled={isPending} onClick={restartCycle}>
          Restart cycle
        </Button>
        {hasPhase && (
          <Button variant="secondary" size="sm" fullWidth={false} disabled={isPending} onClick={restartPhase}>
            Restart phase
          </Button>
        )}
      </div>
    </section>
  )
}
