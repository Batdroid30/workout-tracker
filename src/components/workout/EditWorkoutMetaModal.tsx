'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateWorkoutMetaAction } from '@/app/(app)/workout/[id]/actions'
import { Button } from '@/components/ui/Button'
import { useDialog } from '@/providers/DialogProvider'
import { Edit2 } from 'lucide-react'

interface EditWorkoutMetaModalProps {
  workoutId: string
  initialTitle: string | null
  initialDuration: number | null
  initialNotes: string | null
  children: React.ReactNode
}

export function EditWorkoutMetaModal({ workoutId, initialTitle, initialDuration, initialNotes, children }: EditWorkoutMetaModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState(initialTitle || '')
  const [duration, setDuration] = useState(initialDuration ? Math.floor(initialDuration / 60) : 0) // stored in minutes
  const [notes, setNotes] = useState(initialNotes || '')
  
  const [isPending, startTransition] = useTransition()
  const dialog = useDialog()
  const router = useRouter()

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateWorkoutMetaAction(workoutId, title, duration * 60, notes)
        setIsOpen(false)
        router.refresh()
      } catch (err: any) {
        dialog.alert({ title: 'Error', description: err.message })
      }
    })
  }

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer group relative inline-block">
        {children}
        <div className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-zinc-800 rounded-md">
          <Edit2 className="w-3 h-3 text-zinc-400" />
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-6">Edit Workout</h3>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Duration (minutes)</label>
                <input 
                  type="number" 
                  value={duration || ''}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Notes</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-bold text-zinc-400 hover:bg-zinc-800 rounded-xl transition-colors"
                disabled={isPending}
              >
                Cancel
              </button>
              <Button onClick={handleSave} disabled={isPending} className="h-10 px-6">
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
