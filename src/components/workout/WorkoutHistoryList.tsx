'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Trophy, Loader2, Trash2 } from 'lucide-react'
import { deleteWorkoutAction } from '@/app/(app)/workout/actions'
import { useDialog } from '@/providers/DialogProvider'
import { useToast } from '@/providers/ToastProvider'

interface WorkoutItem {
  id: string
  title: string | null
  started_at: string
  duration_seconds: number | null
  prCount: number
  workout_exercises: Array<{
    exercise: { name: string }
    sets: Array<{ weight_kg: number; reps: number }>
  }>
}

interface WorkoutHistoryListProps {
  workouts: WorkoutItem[]
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
    return acc + (we.sets?.reduce((s, set) => s + ((set.weight_kg || 0) * (set.reps || 0)), 0) || 0)
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
      } else {
        toast.success('Workout deleted')
      }
    })
  }

  if (deleted) return null

  return (
    <Link href={`/workout/${workout.id}`} className="block">
      <div className="glass-panel border border-[#334155] hover:border-[#CCFF00]/30 rounded-xl p-4 active:scale-[0.98] transition-all cursor-pointer">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-black text-sm text-white uppercase tracking-tight">{workout.title || 'Workout'}</h3>
            <p className="text-[11px] text-[#4a5568] font-body mt-0.5">
              {formatWorkoutDate(workout.started_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {workout.prCount > 0 && (
              <div className="bg-[#CCFF00]/10 text-[#CCFF00] px-2 py-1 flex items-center gap-1 rounded-lg text-[10px] font-black border border-[#CCFF00]/20 uppercase">
                <Trophy className="w-3 h-3" /><span>{workout.prCount}</span>
              </div>
            )}
            {workout.duration_seconds && (
              <div className="bg-[#151b2d] text-[#adb4ce] px-2 py-1 rounded-lg text-[10px] font-bold border border-[#334155]">
                {Math.floor(workout.duration_seconds / 60)}m
              </div>
            )}
            {/* Inline delete — no separate DeleteWorkoutButton needed */}
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="-mr-1 p-2 rounded-lg hover:bg-red-500/10 text-[#4a5568] hover:text-red-400 transition-colors disabled:opacity-50"
              aria-label="Delete workout"
            >
              {isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Trash2 className="w-4 h-4" />
              }
            </button>
          </div>
        </div>

        <span className="text-white font-black text-lg tracking-tight">
          {workoutVolume >= 1000 ? `${(workoutVolume / 1000).toFixed(1)}k` : workoutVolume}
          <span className="text-[11px] text-[#4a5568] ml-0.5 font-bold">kg</span>
        </span>

        <div className="mt-2 pt-2 border-t border-[#1e293b] text-[11px] font-body text-[#4a5568] truncate">
          {exerciseNames}
        </div>
      </div>
    </Link>
  )
}

// ─── List ─────────────────────────────────────────────────────────────────────

export function WorkoutHistoryList({ workouts }: WorkoutHistoryListProps) {
  if (workouts.length === 0) {
    return (
      <div className="glass-panel border border-dashed border-[#334155] rounded-xl p-8 text-center">
        <p className="text-[#4a5568] text-sm font-body">No workouts yet. Start your first session!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {workouts.map(workout => (
        <WorkoutHistoryCard key={workout.id} workout={workout} />
      ))}
    </div>
  )
}
