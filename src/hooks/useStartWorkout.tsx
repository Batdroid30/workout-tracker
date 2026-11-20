'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkoutStore } from '@/store/workout.store'
import { useDialog } from '@/providers/DialogProvider'
import { RunningWorkoutSheet } from '@/components/workout/RunningWorkoutSheet'

interface PendingStart {
  begin: () => void
  label: string
}

// Every way of starting a workout goes through here, so a workout in progress
// is never overwritten without the lifter choosing to discard it.
export function useStartWorkout(): { start: (begin: () => void, label: string) => void; sheet: ReactNode } {
  const router = useRouter()
  const dialog = useDialog()
  const running = useWorkoutStore(state => state.activeWorkout)
  const discardWorkout = useWorkoutStore(state => state.discardWorkout)
  const [pending, setPending] = useState<PendingStart | null>(null)

  const start = (begin: () => void, label: string) => {
    if (!running) return begin()
    setPending({ begin, label })
  }

  const resume = () => {
    setPending(null)
    router.push('/workout')
  }

  const replace = async () => {
    if (!pending || !running) return
    const confirmed = await dialog.confirm({
      title: `Discard ${running.title}?`,
      description: 'Its sets will be lost. This can\u2019t be undone.',
      danger: true,
      confirmText: 'Discard',
    })
    if (!confirmed) return
    const next = pending
    setPending(null)
    discardWorkout()
    next.begin()
  }

  const sheet = running ? (
    <RunningWorkoutSheet
      isOpen={pending !== null}
      runningTitle={running.title}
      nextLabel={pending?.label ?? 'a new workout'}
      onResume={resume}
      onReplace={replace}
      onClose={() => setPending(null)}
    />
  ) : null

  return { start, sheet }
}
