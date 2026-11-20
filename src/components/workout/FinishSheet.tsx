'use client'

import { BottomSheet, Button, ToggleChip } from '@/components/ui'
import type { FinishSituation } from '@/lib/workout-session'

interface FinishChoicesProps {
  situation: FinishSituation
  /** Set only when the workout came from a routine and was changed. */
  routineTitle: string | null
  updateRoutine: boolean
  onToggleRoutine: () => void
  onFinish: (options: { tickRest: boolean }) => void
  onDiscard: () => void
  onKeepGoing: () => void
}

const COPY: Record<FinishSituation['kind'], { title: (count: number) => string; detail: string }> = {
  empty: { title: () => 'Nothing logged yet', detail: 'Add an exercise, or discard this workout.' },
  ready: { title: () => 'Finish workout?', detail: 'Every set you logged is ticked.' },
  unticked: {
    title: count => `${count} ${count === 1 ? "set isn't" : "sets aren't"} ticked`,
    detail: 'Sets that aren\u2019t ticked aren\u2019t saved.',
  },
}

export function FinishChoices({ situation, routineTitle, updateRoutine, onToggleRoutine, onFinish, onDiscard, onKeepGoing }: FinishChoicesProps) {
  const copy = COPY[situation.kind]
  const count = situation.kind === 'unticked' ? situation.count : 0

  return (
    <div className="space-y-3">
      <div>
        <h3 className="t-title-3">{copy.title(count)}</h3>
        <p className="t-body-sm mt-1">{copy.detail}</p>
      </div>

      {routineTitle && situation.kind !== 'empty' && (
        <ToggleChip selected={updateRoutine} onClick={onToggleRoutine} className="w-full justify-start px-4">
          Update {routineTitle} with today&apos;s changes
        </ToggleChip>
      )}

      {situation.kind === 'empty' && <Button variant="destructive" onClick={onDiscard}>Discard workout</Button>}
      {situation.kind === 'ready' && <Button onClick={() => onFinish({ tickRest: false })}>Finish</Button>}
      {situation.kind === 'unticked' && (
        <>
          <Button onClick={() => onFinish({ tickRest: true })}>Tick them and finish</Button>
          <Button variant="secondary" onClick={() => onFinish({ tickRest: false })}>Finish without them</Button>
        </>
      )}
      <Button variant="ghost" onClick={onKeepGoing}>Keep going</Button>

      {situation.kind !== 'empty' && (
        <button type="button" onClick={onDiscard} className="focus-ring mx-auto block min-h-11 rounded px-2 text-sm font-medium text-negative">
          Discard workout
        </button>
      )}
    </div>
  )
}

interface FinishSheetProps extends Omit<FinishChoicesProps, 'onKeepGoing'> {
  isOpen: boolean
  onClose: () => void
}

// One sheet for every way a workout can end, instead of a chain of dialogs.
export function FinishSheet({ isOpen, onClose, ...choices }: FinishSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Finish">
      <FinishChoices {...choices} onKeepGoing={onClose} />
    </BottomSheet>
  )
}
