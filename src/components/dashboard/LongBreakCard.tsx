'use client'

import { useTransition } from 'react'
import { Button, Card } from '@/components/ui'
import { dismissBreakPromptAction, restartPhaseAction } from '@/app/(app)/account/training-actions'

interface LongBreakCardProps {
  missedWeeks: number
}

// Shown once per break (2+ weeks below half the weekly goal). Nothing resets
// unless the lifter chooses Restart.
export function LongBreakCard({ missedWeeks }: LongBreakCardProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <Card>
      <h2 className="t-title-3">You&apos;ve been away {missedWeeks} weeks</h2>
      <p className="t-body-sm mt-1">
        Restart your phase from week 1 so deloads and targets fit where you are now.
      </p>
      <div className="mt-4 flex gap-2">
        <Button
          fullWidth={false}
          loading={isPending}
          onClick={() => startTransition(async () => { await restartPhaseAction() })}
        >
          Restart
        </Button>
        <Button
          variant="ghost"
          fullWidth={false}
          disabled={isPending}
          onClick={() => startTransition(async () => { await dismissBreakPromptAction() })}
        >
          Keep going
        </Button>
      </div>
    </Card>
  )
}
