'use client'

import { useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { BottomSheet, Button, Card, Chip, getButtonClassName } from '@/components/ui'
import { useWorkoutStore } from '@/store/workout.store'
import { useToast } from '@/providers/ToastProvider'
import { setSplitPositionAction } from '@/app/(app)/routines/split-actions'
import type { SessionSuggestion } from '@/lib/data/splits'
import type { getRoutines } from '@/lib/data/routines'

export type RoutineWithExercises = Awaited<ReturnType<typeof getRoutines>>[number]

interface TodayCardProps {
  suggestion: SessionSuggestion | null
  routines: RoutineWithExercises[]
  weekLabel: string | null
}

const ROUTINES_HREF = '/routines#routines'
const playIcon = <Play className="w-4 h-4 fill-current" aria-hidden="true" />

// The one card that answers "what do I do today?" — on Home and on Train.
export function TodayCard({ suggestion, routines, weekLabel }: TodayCardProps) {
  const router = useRouter()
  const startRoutine = useWorkoutStore(state => state.startRoutine)
  const toast = useToast()

  const start = (routineId: string | null) => {
    const routine = routines.find(candidate => candidate.id === routineId)
    if (!routine) {
      toast.error("Couldn't find that routine. Pick another one.")
      router.push(ROUTINES_HREF)
      return
    }
    startRoutine(routine)
    router.push('/workout')
  }

  return (
    <Card>
      {weekLabel && <Chip>{weekLabel}</Chip>}
      <div className={weekLabel ? 'mt-3' : undefined}>
        <TodayBody suggestion={suggestion} onStart={start} />
      </div>
    </Card>
  )
}

function TodayBody({ suggestion, onStart }: { suggestion: SessionSuggestion | null; onStart: (routineId: string | null) => void }) {
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

  if (suggestion.kind === 'focus') {
    return (
      <Summary title={`${suggestion.focus} day`} detail={suggestion.reason}>
        <Link href="/routines" className={getButtonClassName({})}>{playIcon} Start workout</Link>
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
