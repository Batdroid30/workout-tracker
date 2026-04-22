'use client'

import { useState, useTransition } from 'react'
import { Play, MoreVertical, Edit2, Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useWorkoutStore } from '@/store/workout.store'
import { deleteRoutineAction } from '@/app/(app)/routines/actions'
import { useDialog } from '@/providers/DialogProvider'

interface RoutineCardProps {
  routine: any 
}

export function RoutineCard({ routine }: RoutineCardProps) {
  const router = useRouter()
  const startRoutine = useWorkoutStore(state => state.startRoutine)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const dialog = useDialog()

  const handleStartRoutine = () => {
    startRoutine(routine)
    router.push('/workout')
  }

  const handleDelete = async () => {
    setMenuOpen(false)
    const confirmed = await dialog.confirm({
      title: 'Delete Routine',
      description: 'Are you sure you want to delete this routine? This action cannot be undone.',
      danger: true,
      confirmText: 'Delete'
    })
    
    if (confirmed) {
      startTransition(() => {
        deleteRoutineAction(routine.id)
      })
    }
  }

  const handleModify = () => {
    setMenuOpen(false)
    router.push(`/routines/${routine.id}/edit`)
  }

  const exerciseNames = routine.routine_exercises.map((re: any) => re.exercise?.name).join(', ')

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg text-white mb-1">{routine.title}</h3>
          {routine.notes && <p className="text-sm text-zinc-400 mb-2">{routine.notes}</p>}
          <p className="text-sm text-zinc-500 line-clamp-2">{exerciseNames || "No exercises"}</p>
        </div>
        <div className="relative">
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-zinc-500 hover:text-white p-2 -mr-2 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-20">
              <button 
                onClick={handleModify}
                className="w-full text-left flex items-center px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-colors"
              >
                <Edit2 className="w-4 h-4 mr-2" /> Modify
              </button>
              <button 
                onClick={handleDelete}
                disabled={isPending}
                className="w-full text-left flex items-center px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors border-t border-zinc-800"
              >
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={handleStartRoutine}
        className="w-full py-3 bg-brand text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-hover transition-colors active:scale-95"
      >
        <Play className="w-5 h-5 fill-current" /> Start Routine
      </button>
    </div>
  )
}
