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
    if (confirmed) startTransition(() => { deleteRoutineAction(routine.id) })
  }

  const handleModify = () => {
    setMenuOpen(false)
    router.push(`/routines/${routine.id}/edit`)
  }

  const exerciseNames = routine.routine_exercises.map((re: any) => re.exercise?.name).join(' · ')

  return (
    <div className="glass-panel border border-[#334155] hover:border-[#CCFF00]/30 rounded-xl p-4 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-black text-base text-white uppercase tracking-tight mb-1">{routine.title}</h3>
          {routine.notes && <p className="text-sm text-[#adb4ce] font-body mb-2">{routine.notes}</p>}
          <p className="text-[11px] text-[#4a5568] font-body line-clamp-2">{exerciseNames || 'No exercises'}</p>
        </div>
        <div className="relative ml-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-[#4a5568] hover:text-[#adb4ce] p-2 -mr-1 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-[#0c1324] border border-[#334155] rounded-xl shadow-xl overflow-hidden z-20">
              <button onClick={handleModify} className="w-full text-left flex items-center px-4 py-3 text-sm font-bold text-[#dce1fb] hover:bg-[#151b2d] transition-colors">
                <Edit2 className="w-4 h-4 mr-2" /> Modify
              </button>
              <button onClick={handleDelete} disabled={isPending} className="w-full text-left flex items-center px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors border-t border-[#334155]">
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleStartRoutine}
        className="w-full py-2.5 bg-[#CCFF00] text-[#020617] font-black rounded-xl flex items-center justify-center gap-2 hover:bg-[#abd600] transition-colors active:scale-[0.97] uppercase tracking-widest text-xs shadow-[0_4px_16px_rgba(204,255,0,0.2)]"
      >
        <Play className="w-4 h-4 fill-current" /> Start Routine
      </button>
    </div>
  )
}
