'use client'

import type { ReactNode } from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, History, Target } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { cn } from '@/lib/utils'
import type { LoadMode } from '@/lib/suggestions/explanation-labels'
import type { ExercisePlan } from '@/lib/suggestions/types'
import { buildWhyStory } from '@/lib/suggestions/why-story'

const MIN_SUGGESTIONS_FOR_HIT_RATE = 3

interface WhyThisWeightSheetProps {
  plan: ExercisePlan
  hitRate: { hits: number; total: number } | null
  loadMode: LoadMode
  bodyweightKg: number
  onClose: () => void
}

interface StoryStepProps {
  icon: ReactNode
  label: string
  children: ReactNode
}

function StoryStep({ icon, label, children }: StoryStepProps) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-3">
      <span className="w-7 h-7 rounded-full bg-surface-raised flex items-center justify-center text-secondary" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="t-caption">{label}</p>
        {children}
      </div>
    </div>
  )
}

export function WhyThisWeightSheet({ plan, hitRate, loadMode, bodyweightKg, onClose }: WhyThisWeightSheetProps) {
  const story = buildWhyStory(plan, loadMode, bodyweightKg)
  const hasHitRate = hitRate !== null && hitRate.total >= MIN_SUGGESTIONS_FOR_HIT_RATE

  return (
    <BottomSheet isOpen onClose={onClose} title="Why this weight">
      <div className="space-y-4">
        {story.lastTime && (
          <StoryStep icon={<History className="w-3.5 h-3.5" />} label={story.lastTime.heading}>
            <p className="mono text-sm text-primary tabular-nums">{story.lastTime.sets}</p>
            <p className="t-caption">{story.lastTime.total}</p>
          </StoryStep>
        )}

        <StoryStep icon={<CalendarDays className="w-3.5 h-3.5" />} label="This week">
          <p className="text-sm text-primary">{story.thisWeek.title}</p>
          {story.thisWeek.note && <p className="text-sm text-secondary">{story.thisWeek.note}</p>}
        </StoryStep>

        <StoryStep icon={<ArrowRight className="w-3.5 h-3.5" />} label="So today">
          <p className="text-sm text-primary">{story.today}</p>
        </StoryStep>

        <div className="rounded-control border border-positive bg-positive-soft px-3 py-2.5">
          <p className="t-caption flex items-center gap-1.5 text-positive">
            <Target className="w-3.5 h-3.5" aria-hidden="true" />
            Your target
          </p>
          <p className="mono text-lg text-primary tabular-nums mt-1">{story.target.sets}</p>
          {story.target.total && <p className="text-sm text-positive">{story.target.total}</p>}
          <p className="text-sm text-secondary mt-1">{story.target.effort}</p>
        </div>

        <div>
          <p className="t-caption mb-1">How we worked this out</p>
          <ul>
            {story.effort.map(row => (
              <li key={row.label} className="flex justify-between gap-3 border-t border-border py-1.5 text-sm">
                <span className="text-secondary shrink-0">{row.label}</span>
                <span className="text-primary text-right">{row.value}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 border-t border-border py-1.5 text-sm">
              <span className="text-secondary shrink-0">How sure we are</span>
              <span className={cn('flex items-center gap-1 text-right', story.confidence.isConfident ? 'text-positive' : 'text-primary')}>
                {story.confidence.isConfident && <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
                {story.confidence.text}
              </span>
            </li>
          </ul>
        </div>

        {hasHitRate && (
          <p className="t-caption">{`You've hit ${hitRate.hits} of ${hitRate.total} suggestions on this lift`}</p>
        )}
        <p className="text-sm font-medium text-primary">{story.closing}</p>
      </div>
    </BottomSheet>
  )
}
