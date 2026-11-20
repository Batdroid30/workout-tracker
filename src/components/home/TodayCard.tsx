'use client'

import { useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { BottomSheet, Button, Card, Chip, getButtonClassName } from '@/components/ui'
import { useWorkoutStore } from '@/store/workout.store'
import { useToast } from '@/providers/ToastProvider'
import { setSplitPositionAction } from '@/app/(app)/routines/split-actions'
import { FocusWorkoutLauncher } from '@/components/workout/FocusWorkoutLauncher'
import { useStartWorkout } from '@/hooks/useStartWorkout'
import { useNow } from '@/hooks/useNow'
import { isSameLocalDay } from '@/lib/time'
import type { TrainingPhase } from '@/types/database'
import type { SessionSuggestion } from '@/lib/data/splits'
import type { getRoutines } from '@/lib/data/routines'

export type RoutineWithExercises = Awaited<ReturnType<typeof getRoutines>>[number]

interface TodayCardProps {
  suggestion: SessionSuggestion | null
  routines: RoutineWithExercises[]
  weekLabel: string | null
  trainingPhase?: TrainingPhase | null
}

const ROUTINES_HREF = '/routines#routines'
const SECONDS_PER_MINUTE = 60
const playIcon = <Play className="w-4 h-4 fill-current" aria-hidden="true" />

// The one card that answers "what do I do today?" — on Home and on Train.
export function TodayCard({ suggestion, routines, weekLabel, trainingPhase = null }: TodayCardProps) {
  const router = useRouter()
  const startRoutine = useWorkoutStore(state => state.startRoutine)
  const toast = useToast()
  const { start: guardedStart, sheet } = useStartWorkout()

  const start = (routineId: string | null) => {
    const routine = routines.find(candidate => candidate.id === routineId)
    if (!routine) {
      toast.error("Couldn't find that routine. Pick another one.")
      router.push(ROUTINES_HREF)
      return
    }
    guardedStart(() => {
      startRoutine(routine)
      router.push('/workout')
    }, routine.title)
  }

  return (
    <Card>
      {sheet}
      {weekLabel && <Chip>{weekLabel}</Chip>}
      <div className={weekLabel ? 'mt-3' : undefined}>
        <TodayBody suggestion={suggestion} onStart={start} trainingPhase={trainingPhase} />
      </div>
    </Card>
  )
}

function TodayBody({ suggestion, onStart, trainingPhase }: {
  suggestion: SessionSuggestion | null
  onStart: (routineId: string | null) => void
  trainingPhase: TrainingPhase | null
}) {
  // The phone decides what "today" is, so it's right in the lifter's morning
  // and flips at their midnight.
  const now = useNow(60_000)
  const lastStartedAt = suggestion?.kind === 'split' ? suggestion.lastSplitWorkout?.startedAt : undefined
  const doneToday = lastStartedAt !== undefined && now > 0 && isSameLocalDay(lastStartedAt, new Date(now))

  if (!suggestion) {
    return (
      <Summary title="Start a workout" detail="Pick a routine or start empty.">
        <Link href="/routines" className={getButtonClassName({})}>{playIcon} Start workout</Link>
      </Summary>
    )
  }

  if (suggestion.kind === 'routine') {
    return (
      <Summary title={suggestion.title} detail={suggestion.reason}>
        <Button onClick={() => onStart(suggestion.routineId)} leadingIcon={playIcon}>Start workout</Button>
      </Summary>
    )
  }

  if (suggestion.kind === 'split' && suggestion.lastSplitWorkout && doneToday) {
    const { title, durationSeconds } = suggestion.lastSplitWorkout
    const minutes = durationSeconds ? ` · ${Math.round(durationSeconds / SECONDS_PER_MINUTE)} min` : ''
    const upNext = suggestion.next.isRest ? 'rest' : suggestion.routineTitle ?? 'your next day'
    return (
      <Summary title={`${title} ✓`} detail={`Done for today${minutes}`} note={`Up next tomorrow: ${upNext}`}>
        <Link href={ROUTINES_HREF} className={getButtonClassName({ variant: 'secondary' })}>Train again</Link>
      </Summary>
    )
  }

  if (suggestion.kind === 'focus') {
    return (
      <Summary title={suggestion.focus} detail={suggestion.reason}>
        <FocusWorkoutLauncher trainingPhase={trainingPhase}>
          {open => <Button onClick={open} leadingIcon={playIcon}>Start workout</Button>}
        </FocusWorkoutLauncher>
      </Summary>
    )
  }

  const { next } = suggestion
  const welcomeBack = next.welcomeBack && next.daysSinceLast !== null
    ? `Welcome back — it's been ${next.daysSinceLast} days.`
    : null

  if (next.isRest) {
    return (
      <Summary title="Rest day" detail="Recover today — or train anyway." note={welcomeBack}>
        <Link href={ROUTINES_HREF} className={getButtonClassName({ variant: 'secondary' })}>Train anyway</Link>
      </Summary>
    )
  }

  return (
    <Summary
      title={suggestion.routineTitle ?? 'Next session'}
      detail={`${suggestion.exerciseCount} exercises · ${suggestion.setCount} sets`}
      note={welcomeBack}
    >
      <Button onClick={() => onStart(next.item.routineId)} leadingIcon={playIcon}>Start workout</Button>
      <NotToday splitId={suggestion.split.id} skipToPosition={suggestion.skipToPosition} />
    </Summary>
  )
}

function Summary({ title, detail, note = null, children }: { title: string; detail: string; note?: string | null; children: ReactNode }) {
  return (
    <>
      <p className="t-caption">Today</p>
      <h2 className="t-title-2 mt-1">{title}</h2>
      <p className="t-body-sm mt-1">{detail}</p>
      {note && <p className="t-body-sm mt-2">{note}</p>}
      <div className="mt-4 flex items-center gap-2">{children}</div>
    </>
  )
}

function NotToday({ splitId, skipToPosition }: { splitId: string; skipToPosition: number }) {
  const router = useRouter()
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const skip = () => {
    setIsOpen(false)
    startTransition(async () => {
      const result = await setSplitPositionAction(splitId, skipToPosition)
      if (!result.success) toast.error(result.error)
    })
  }

  const pickAnother = () => {
    setIsOpen(false)
    router.push(ROUTINES_HREF)
  }

  return (
    <>
      <Button variant="ghost" fullWidth={false} className="shrink-0 whitespace-nowrap" disabled={isPending} onClick={() => setIsOpen(true)}>
        Not today
      </Button>
      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="Not today">
        <div className="space-y-2">
          <Button variant="secondary" onClick={skip}>Skip to next</Button>
          <Button variant="ghost" onClick={pickAnother}>Pick another routine</Button>
        </div>
      </BottomSheet>
    </>
  )
}
