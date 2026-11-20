'use client'

import { useState, useTransition } from 'react'
import { Play, MoreVertical, Edit2, Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useWorkoutStore } from '@/store/workout.store'
import { deleteRoutineAction } from '@/app/(app)/routines/actions'
import { useDialog } from '@/providers/DialogProvider'
import { useToast } from '@/providers/ToastProvider'
import { Button } from '@/components/ui'
import { useStartWorkout } from '@/hooks/useStartWorkout'

interface RoutineCardProps {
  routine: any
}

export function RoutineCard({ routine }: RoutineCardProps) {
  const router        = useRouter()
  const startRoutine  = useWorkoutStore(state => state.startRoutine)
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [deleted,   setDeleted]   = useState(false)
  const [isPending, startTransition] = useTransition()
  const dialog = useDialog()
  const toast  = useToast()

  const { start, sheet } = useStartWorkout()

  const handleStartRoutine = () => start(() => {
    startRoutine(routine)
    router.push('/workout')
  }, routine.title)

  const handleDelete = async () => {
    setMenuOpen(false)
    const confirmed = await dialog.confirm({
      title:       'Delete routine',
      description: 'Are you sure you want to delete this routine? This action cannot be undone.',
      danger:       true,
      confirmText: 'Delete',
    })
    if (!confirmed) return

    setDeleted(true)
    startTransition(async () => {
      try {
        await deleteRoutineAction(routine.id)
        toast.success(`"${routine.title}" deleted`)
      } catch {
        setDeleted(false)
        toast.error('Failed to delete routine')
      }
    })
  }

  const handleModify = () => {
    setMenuOpen(false)
    router.push(`/routines/${routine.id}/edit`)
  }

  const exerciseCount = routine.routine_exercises?.length ?? 0
  const exerciseNames = routine.routine_exercises
    ?.map((re: any) => re.exercise?.name)
    .filter(Boolean)
    .join(' · ')

  if (deleted) return null

  return (
    <div className="card p-4 relative">
      {sheet}
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-primary leading-snug">
            {routine.title}
          </h3>
          {routine.notes && (
            <p className="text-xs text-secondary mt-0.5 line-clamp-1">{routine.notes}</p>
          )}
        </div>

        {/* Overflow menu */}
        <div className="relative ml-2 shrink-0">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-1.5 -mr-1 rounded-pill text-tertiary hover:text-primary hover:bg-surface-raised transition-colors"
            aria-label="Routine options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              {/* Backdrop to close menu */}
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1 w-44 z-20 rounded-control overflow-hidden bg-surface-raised border border-border-strong shadow-[var(--shadow-overlay)]"
              >
                <button
                  onClick={handleModify}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-primary hover:bg-surface transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-tertiary" /> Edit
                </button>
                <div className="h-px bg-border" />
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-negative hover:bg-negative-soft transition-colors disabled:opacity-50"
                >
                  {isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Exercise preview */}
      <p className="t-caption text-tertiary mb-4 truncate">
        {exerciseNames || 'No exercises added'}
        {exerciseCount > 0 && (
          <span className="ml-2 text-tertiary">
            · {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
          </span>
        )}
      </p>

      {/* Start button */}
      <Button onClick={handleStartRoutine} leadingIcon={<Play className="w-3.5 h-3.5 fill-current" />}>
        Start routine
      </Button>
    </div>
  )
}
