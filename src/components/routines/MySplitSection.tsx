'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Button, Card, SectionHeader, getButtonClassName } from '@/components/ui'
import { TodayCard, type RoutineWithExercises } from '@/components/home/TodayCard'
import { useToast } from '@/providers/ToastProvider'
import { setActiveSplitAction } from '@/app/(app)/routines/split-actions'
import type { SessionSuggestion, SplitWithItems } from '@/lib/data/splits'
import type { TrainingPhase } from '@/types/database'

interface MySplitSectionProps {
  splits: SplitWithItems[]
  suggestion: SessionSuggestion | null
  routines: RoutineWithExercises[]
  trainingPhase?: TrainingPhase | null
}

export function MySplitSection({ splits, suggestion, routines, trainingPhase = null }: MySplitSectionProps) {
  const active = splits.find(split => split.isActive) ?? null
  const others = splits.filter(split => !split.isActive)
  const hasActiveSuggestion = active !== null && suggestion?.kind === 'split'

  return (
    <section className="mb-7">
      <SectionHeader
        title="My split"
        action={active ? { label: 'Edit', href: `/routines/split/${active.id}` } : undefined}
      />
      <div className="mt-3 space-y-3">
        {hasActiveSuggestion && suggestion.kind === 'split' ? (
          <SplitDays split={active} nextIndex={suggestion.next.index} />
        ) : (
          <SetUpSplit />
        )}
        {suggestion && <TodayCard suggestion={suggestion} routines={routines} weekLabel={null} trainingPhase={trainingPhase} />}
        {others.length > 0 && <OtherSplits splits={others} />}
      </div>
    </section>
  )
}

function SplitDays({ split, nextIndex }: { split: SplitWithItems; nextIndex: number }) {
  return (
    <ol className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5" aria-label={split.name}>
      {split.items.map((item, index) => {
        const isNext = index === nextIndex
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
  )
}

function SetUpSplit() {
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
