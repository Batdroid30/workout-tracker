'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { Button, Card, SectionHeader, BottomSheet, getButtonClassName } from '@/components/ui'
import { useWorkoutStore } from '@/store/workout.store'
import { useToast } from '@/providers/ToastProvider'
import { setActiveSplitAction, setSplitPositionAction } from '@/app/(app)/routines/split-actions'
import type { SessionSuggestion, SplitWithItems } from '@/lib/data/splits'
import type { getRoutines } from '@/lib/data/routines'

type RoutineWithExercises = Awaited<ReturnType<typeof getRoutines>>[number]

interface MySplitSectionProps {
  splits: SplitWithItems[]
  suggestion: SessionSuggestion | null
  routines: RoutineWithExercises[]
}

const ROUTINES_ANCHOR = 'routines'

function scrollToRoutines() {
  document.getElementById(ROUTINES_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function MySplitSection({ splits, suggestion, routines }: MySplitSectionProps) {
  const active = splits.find(split => split.isActive) ?? null
  const others = splits.filter(split => !split.isActive)

  return (
    <section className="mb-7">
      <SectionHeader
        title="My split"
        action={active ? { label: 'Edit', href: `/routines/split/${active.id}` } : undefined}
      />
      <div className="mt-3 space-y-3">
        {active && suggestion?.kind === 'split'
          ? <ActiveSplit split={active} suggestion={suggestion} routines={routines} />
          : <NoSplit suggestion={suggestion} routines={routines} />}
        {others.length > 0 && <OtherSplits splits={others} />}
      </div>
    </section>
  )
}

function ActiveSplit({ split, suggestion, routines }: {
  split: SplitWithItems
  suggestion: Extract<SessionSuggestion, { kind: 'split' }>
  routines: RoutineWithExercises[]
}) {
  const router = useRouter()
  const startRoutine = useWorkoutStore(state => state.startRoutine)
  const toast = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { next } = suggestion

  const start = () => {
    const routine = routines.find(r => r.id === next.item.routineId)
    if (!routine) {
      toast.error("Couldn't find that routine. Pick another below.")
      return
    }
    startRoutine(routine)
    router.push('/workout')
  }

  const skipToNext = () => {
    setSheetOpen(false)
    startTransition(async () => {
      const result = await setSplitPositionAction(split.id, (next.index + 1) % split.items.length)
      if (!result.success) toast.error(result.error)
    })
  }

  const pickAnother = () => {
    setSheetOpen(false)
    scrollToRoutines()
  }

  return (
    <>
      <ol className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5" aria-label={split.name}>
        {split.items.map((item, index) => {
          const isNext = index === next.index
          return (
            <li
              key={item.id}
              aria-current={isNext ? 'step' : undefined}
              className={`shrink-0 inline-flex items-center min-h-9 px-3 rounded-pill border text-sm ${
                isNext ? 'bg-primary text-bg border-primary font-medium' : 'bg-surface-raised text-secondary border-border'
              }`}
            >
              {item.routineTitle ?? 'Rest'}
            </li>
          )
        })}
      </ol>

      <Card>
        <p className="t-caption">Up next</p>
        {next.isRest ? (
          <>
            <h3 className="t-title-2 mt-1">Rest day</h3>
            <p className="t-body-sm mt-1">Recover today — or train anyway.</p>
          </>
        ) : (
          <>
            <h3 className="t-title-2 mt-1">{suggestion.routineTitle}</h3>
            <p className="t-body-sm mt-1">{suggestion.exerciseCount} exercises · {suggestion.setCount} sets</p>
          </>
        )}
        {next.welcomeBack && next.daysSinceLast !== null && (
          <p className="t-body-sm mt-2">Welcome back — it&apos;s been {next.daysSinceLast} days.</p>
        )}
        <div className="mt-4 flex gap-2">
          {next.isRest ? (
            <Button variant="secondary" onClick={pickAnother}>Train anyway</Button>
          ) : (
            <Button onClick={start} leadingIcon={<Play className="w-4 h-4 fill-current" aria-hidden="true" />}>Start</Button>
          )}
          <Button variant="ghost" fullWidth={false} className="shrink-0 whitespace-nowrap" disabled={isPending} onClick={() => setSheetOpen(true)}>
            Not today
          </Button>
        </div>
      </Card>

      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Not today">
        <div className="space-y-2">
          <Button variant="secondary" onClick={skipToNext}>Skip to next</Button>
          <Button variant="ghost" onClick={pickAnother}>Pick another routine</Button>
        </div>
      </BottomSheet>
    </>
  )
}

function NoSplit({ suggestion, routines }: { suggestion: SessionSuggestion | null; routines: RoutineWithExercises[] }) {
  const router = useRouter()
  const startRoutine = useWorkoutStore(state => state.startRoutine)

  const startSuggested = (routineId: string) => {
    const routine = routines.find(r => r.id === routineId)
    if (!routine) return
    startRoutine(routine)
    router.push('/workout')
  }

  return (
    <Card>
      <h3 className="t-title-3">Set up your split</h3>
      <p className="t-body-sm mt-1">Put your routines in order, add rest days, and Lifts will suggest what&apos;s next.</p>
      <Link
        href="/routines/split/new"
        className={`${getButtonClassName({ variant: 'secondary', size: 'sm', fullWidth: false })} mt-3`}
      >
        Set up split
      </Link>
      {suggestion && suggestion.kind !== 'split' && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="t-caption">Suggested next</p>
          <p className="t-title-3 mt-1">{suggestion.kind === 'routine' ? suggestion.title : suggestion.focus}</p>
          <p className="t-body-sm mt-0.5">{suggestion.reason}</p>
          {suggestion.kind === 'routine' && (
            <Button
              className="mt-3"
              fullWidth={false}
              size="sm"
              onClick={() => startSuggested(suggestion.routineId)}
              leadingIcon={<Play className="w-4 h-4 fill-current" aria-hidden="true" />}
            >
              Start
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

function OtherSplits({ splits }: { splits: SplitWithItems[] }) {
  const toast = useToast()
  const [isPending, startTransition] = useTransition()

  const activate = (id: string) =>
    startTransition(async () => {
      const result = await setActiveSplitAction(id)
      if (!result.success) toast.error(result.error)
    })

  return (
    <Card padding="none">
      {splits.map((split, index) => (
        <div
          key={split.id}
          className={`flex min-h-14 items-center justify-between gap-3 px-4 ${index > 0 ? 'border-t border-border' : ''}`}
        >
          <Link href={`/routines/split/${split.id}`} className="t-body min-w-0 truncate">{split.name}</Link>
          <Button variant="outline" size="sm" fullWidth={false} disabled={isPending} onClick={() => activate(split.id)}>
            Make active
          </Button>
        </div>
      ))}
    </Card>
  )
}
