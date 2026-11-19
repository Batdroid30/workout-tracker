'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Loader2, Trash2 } from 'lucide-react'
import { deleteWorkoutAction } from '@/app/(app)/workout/actions'
import { useDialog } from '@/providers/DialogProvider'
import { useToast } from '@/providers/ToastProvider'
import type { PRType } from '@/types/database'
import type { WorkoutItem } from '@/types/workout-history'
import { setVolume, workoutBodyweight } from '@/lib/load'
import { Chip } from '@/components/ui'
import { BodyMapDefs } from '@/components/ui/BodyMap'
import { toSessionExercises } from '@/lib/body-map'
import { nextCursor, type HistoryCursor } from '@/lib/data/history-page'
import { SessionBodyMap } from './SessionBodyMap'

// ─── PR badge config ──────────────────────────────────────────────────────────

const PR_BADGE_LABELS: Record<PRType, string> = {
  best_weight: 'W',
  best_1rm: '1RM',
  best_volume: 'VOL',
}

// Display order: weight → 1RM → volume
const PR_DISPLAY_ORDER: PRType[] = ['best_weight', 'best_1rm', 'best_volume']

type LoadMoreResult = { workouts: WorkoutItem[]; hasMore: boolean } | { error: string }

interface WorkoutHistoryListProps {
  workouts: WorkoutItem[]
  initialHasMore?: boolean
  onLoadMore?: (cursor: HistoryCursor | null) => Promise<LoadMoreResult>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats a workout date string into a human-readable label.
 *
 * Uses a pinned locale ('en-GB') so the server and client always produce the
 * same string — avoiding React hydration mismatches from locale differences
 * between the Node.js runtime and the user's browser.
 *
 * Output example: "18 Apr 2026, 14:30"
 */
function formatWorkoutDate(isoString: string): string {
  return new Date(isoString).toLocaleString('en-GB', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

// ─── Single optimistic card ───────────────────────────────────────────────────

function WorkoutHistoryCard({ workout }: { workout: WorkoutItem }) {
  const [deleted,   setDeleted]   = useState(false)
  const [isPending, startTransition] = useTransition()
  const dialog = useDialog()
  const toast  = useToast()

  const exerciseNames = workout.workout_exercises.map(we => we.exercise.name).join(' · ')
  const workoutVolume = workout.workout_exercises.reduce((acc, we) => {
    return acc + (we.sets?.reduce((s, set) => s + setVolume(set.weight_kg || 0, set.reps || 0, we.exercise.name, workoutBodyweight(workout.bodyweight_kg)), 0) || 0)
  }, 0)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const confirmed = await dialog.confirm({
      title: 'Delete Workout',
      description: 'Are you sure you want to delete this workout? This action cannot be undone.',
      danger: true,
      confirmText: 'Delete',
    })

    if (!confirmed) return

    // Optimistic — vanish immediately
    setDeleted(true)

    startTransition(async () => {
      const result = await deleteWorkoutAction(workout.id)
      if (result?.error) {
        setDeleted(false)
        toast.error(result.error || 'Failed to delete workout')
      } else if (result.prError) {
        toast.error(result.prError)
      } else {
        toast.success('Workout deleted')
      }
    })
  }

  if (deleted) return null

  return (
    <Link href={`/workout/${workout.id}`} className="block">
      <div className="glass hover:border-border-strong p-4 active:scale-[0.98] transition-all cursor-pointer">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-sm font-medium text-primary">{workout.title || 'Workout'}</h3>
            <p className="mono text-xs text-tertiary mt-0.5">
              {formatWorkoutDate(workout.started_at)}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {PR_DISPLAY_ORDER.filter(t => workout.prTypes?.includes(t)).map(t => (
              <Chip key={t} tone="accent">{PR_BADGE_LABELS[t]}</Chip>
            ))}
            {workout.duration_seconds && (
              <div className="bg-surface-raised text-secondary px-2 py-1 rounded-lg mono text-xs border border-border">
                {Math.floor(workout.duration_seconds / 60)}m
              </div>
            )}
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="-mr-1 p-2 rounded-lg hover:bg-negative-soft text-tertiary hover:text-negative transition-colors disabled:opacity-50"
              aria-label="Delete workout"
            >
              {isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Trash2 className="w-4 h-4" />
              }
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <span className="mono text-lg font-medium text-primary tracking-tight">
              {workoutVolume >= 1000 ? `${(workoutVolume / 1000).toFixed(1)}k` : workoutVolume}
              <span className="text-xs text-tertiary ml-0.5">kg</span>
            </span>

            <div className="mt-2 pt-2 border-t border-border text-xs text-tertiary truncate">
              {exerciseNames}
            </div>
          </div>
          <SessionBodyMap exercises={toSessionExercises(workout.workout_exercises)} />
        </div>
      </div>
    </Link>
  )
}

// ─── List ─────────────────────────────────────────────────────────────────────

export function WorkoutHistoryList({ workouts: initialWorkouts, initialHasMore = false, onLoadMore }: WorkoutHistoryListProps) {
  const [workouts, setWorkouts] = useState(initialWorkouts)
  const [hasMore, setHasMore] = useState(initialHasMore)

  // Fresh server data wins: when the first page changes (refresh, new workout),
  // drop locally appended pages and restart from the new props. Compared by
  // content because callers pass a new array instance on every render.
  const initialSignature = `${initialHasMore}:${initialWorkouts.map(w => w.id).join(',')}`
  const [seenSignature, setSeenSignature] = useState(initialSignature)
  if (seenSignature !== initialSignature) {
    setSeenSignature(initialSignature)
    setWorkouts(initialWorkouts)
    setHasMore(initialHasMore)
  }
  const [isLoadingMore, startLoadMore] = useTransition()
  const toast = useToast()

  const handleLoadMore = () => {
    if (!onLoadMore) return
    startLoadMore(async () => {
      const result = await onLoadMore(nextCursor(workouts))
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      setWorkouts(current => {
        const knownIds = new Set(current.map(w => w.id))
        return [...current, ...result.workouts.filter(w => !knownIds.has(w.id))]
      })
      setHasMore(result.hasMore)
    })
  }

  if (workouts.length === 0) {
    return (
      <div className="glass border border-dashed border-border p-8 text-center">
        <p className="t-caption">No workouts yet. Start your first session!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <BodyMapDefs />
      {workouts.map(workout => (
        <WorkoutHistoryCard key={workout.id} workout={workout} />
      ))}
      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className="w-full min-h-[44px] glass rounded-lg text-sm font-medium text-secondary hover:border-border-strong transition-colors disabled:opacity-50"
        >
          {isLoadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
