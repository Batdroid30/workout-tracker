'use client'

import { BottomSheet, Button } from '@/components/ui'

interface RunningWorkoutChoicesProps {
  runningTitle: string
  nextLabel: string
  onResume: () => void
  onReplace: () => void
}

export function RunningWorkoutChoices({ runningTitle, nextLabel, onResume, onReplace }: RunningWorkoutChoicesProps) {
  return (
    <div className="space-y-3">
      <p className="t-body-sm">{runningTitle} is still running. Starting something new replaces it.</p>
      <Button onClick={onResume}>Resume {runningTitle}</Button>
      <Button variant="destructive" onClick={onReplace}>Discard it and start {nextLabel}</Button>
    </div>
  )
}

interface RunningWorkoutSheetProps extends RunningWorkoutChoicesProps {
  isOpen: boolean
  onClose: () => void
}

// Shown instead of silently overwriting a workout that is still in progress.
export function RunningWorkoutSheet({ isOpen, onClose, ...choices }: RunningWorkoutSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`${choices.runningTitle} is still running`}>
      <RunningWorkoutChoices {...choices} />
    </BottomSheet>
  )
}
