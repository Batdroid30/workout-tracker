'use client'

import { useTransition } from 'react'
import { Button, Card } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { runAction } from '@/lib/run-action'
import { dismissBreakPromptAction, restartPhaseAction } from '@/app/(app)/account/training-actions'

interface LongBreakCardProps {
  missedWeeks: number
}

// Shown once per break (2+ weeks below half the weekly goal). Nothing resets
// unless the lifter chooses Restart.
export function LongBreakCard({ missedWeeks }: LongBreakCardProps) {
  const toast = useToast()
  const [isPending, startTransition] = useTransition()

  const run = (action: () => Promise<unknown>) =>
    startTransition(async () => { await runAction(action, toast.error) })

  return (
    <Card>
      <h2 className="t-title-3">You&apos;ve been away {missedWeeks} weeks</h2>
      <p className="t-body-sm mt-1">
        Restart your phase from week 1 so deloads and targets fit where you are now.
      </p>
      <div className="mt-4 flex gap-2">
        <Button fullWidth={false} loading={isPending} onClick={() => run(restartPhaseAction)}>
          Restart
        </Button>
        <Button variant="ghost" fullWidth={false} disabled={isPending} onClick={() => run(dismissBreakPromptAction)}>
          Keep going
        </Button>
      </div>
    </Card>
  )
}
