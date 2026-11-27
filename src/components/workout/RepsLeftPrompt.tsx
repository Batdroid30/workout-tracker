'use client'

import type { SetRole } from '@/lib/suggestions/types'

type RepsLeft = 0 | 1 | 2 | 3

const REPS_LEFT_OPTIONS: { repsLeft: RepsLeft; label: string }[] = [
  { repsLeft: 0, label: '0' },
  { repsLeft: 1, label: '1' },
  { repsLeft: 2, label: '2' },
  { repsLeft: 3, label: '3+' },
]

/** "3+" reps left is recorded as RPE 7 — the prompt does not try to resolve effort further. */
export function rpeForRepsLeft(repsLeft: RepsLeft): number {
  return 10 - repsLeft
}

/** The set whose effort tells the planner most: the top set, or the last working set when there is none. */
export function isKeySet(role: SetRole, workingIndex: number, workingCount: number, planHasTopSet: boolean): boolean {
  if (role === 'top') return true
  return !planHasTopSet && workingIndex === workingCount - 1
}

interface RepsLeftPromptProps {
  onPick: (rpe: number) => void
  onSkip: () => void
}

export function RepsLeftPrompt({ onPick, onSkip }: RepsLeftPromptProps) {
  return (
    <div className="flex items-center gap-1.5 pb-1.5">
      <span className="shrink-0 text-xs text-secondary">Reps left?</span>
      {REPS_LEFT_OPTIONS.map(option => (
        <button
          key={option.repsLeft}
          type="button"
          onClick={() => onPick(rpeForRepsLeft(option.repsLeft))}
          aria-label={`${option.label} reps left`}
          className="min-h-11 min-w-0 flex-1 rounded-control border border-border bg-surface-raised mono text-sm text-primary active:scale-95 transition-transform"
        >{option.label}</button>
      ))}
      <button
        type="button"
        onClick={onSkip}
        className="min-h-11 min-w-11 shrink-0 px-2 text-xs text-tertiary"
      >Skip</button>
    </div>
  )
}
