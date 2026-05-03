'use client'

import { useState, useTransition } from 'react'
import { Play, MoreVertical, Edit2, Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useWorkoutStore } from '@/store/workout.store'
import { deleteRoutineAction } from '@/app/(app)/routines/actions'
import { useDialog } from '@/providers/DialogProvider'
import { useToast } from '@/providers/ToastProvider'
import { cn } from '@/lib/utils'

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

  const handleStartRoutine = () => {
    startRoutine(routine)
    router.push('/workout')
  }

  const handleDelete = async () => {
    setMenuOpen(false)
    const confirmed = await dialog.confirm({
      title:       'Delete Routine',
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
    <div className="glass hover:border-[var(--accent-line)] transition-colors p-4 relative">
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-[var(--text-hi)] leading-snug">
            {routine.title}
          </h3>
          {routine.notes && (
            <p className="text-[12px] text-[var(--text-mid)] mt-0.5 line-clamp-1">{routine.notes}</p>
          )}
        </div>

        {/* Overflow menu */}
        <div className="relative ml-2 shrink-0">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-1.5 -mr-1 rounded-lg text-[var(--text-low)] hover:text-[var(--text-mid)] hover:bg-white/[0.06] transition-colors"
            aria-label="Routine options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              {/* Backdrop to close menu */}
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1 w-44 z-20 rounded-[var(--radius-inner)] overflow-hidden"
                style={{
                  background: 'rgba(14,19,32,0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--glass-border-strong)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                <button
                  onClick={handleModify}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] text-[var(--text-hi)] hover:bg-white/[0.06] transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[var(--text-low)]" /> Edit
                </button>
                <div className="h-px bg-[var(--glass-border)]" />
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] text-[var(--rose)] hover:bg-[var(--rose)]/10 transition-colors disabled:opacity-50"
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
      <p className="text-[11px] text-[var(--text-low)] mb-4 truncate">
        {exerciseNames || 'No exercises added'}
        {exerciseCount > 0 && (
          <span className="ml-2 text-[var(--text-faint)]">
            · {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
          </span>
        )}
      </p>

      {/* Start button */}
      <button
        onClick={handleStartRoutine}
        className={cn(
          'w-full h-10 rounded-[var(--radius-inner)] flex items-center justify-center gap-2',
          'text-[11px] font-semibold uppercase tracking-widest transition-all active:scale-[0.97]',
          'bg-[var(--accent)] text-[var(--accent-on)] hover:opacity-90',
          'shadow-[0_4px_20px_rgba(243,192,138,0.25)]',
        )}
      >
        <Play className="w-3.5 h-3.5 fill-current" /> Start Routine
      </button>
    </div>
  )
}
