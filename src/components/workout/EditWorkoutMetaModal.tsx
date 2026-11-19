'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateWorkoutMetaAction } from '@/app/(app)/workout/[id]/actions'
import { Button, Input } from '@/components/ui'
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
      <div onClick={() => setIsOpen(true)} className="cursor-pointer group relative block w-full">
        {children}
        <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-surface-raised rounded-md">
          <Edit2 className="w-3 h-3 text-secondary" />
        </div>
      </div>


      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 animate-in fade-in duration-200">
          <div className="bg-surface-raised border border-border p-6 rounded-card shadow-[var(--shadow-overlay)] w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="t-title-2 mb-6">Edit workout</h3>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-medium text-secondary mb-2">Title</label>
                <Input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-2">Duration (minutes)</label>
                <Input
                  type="number"
                  value={duration || ''}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-2">Notes</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-surface-raised border border-border-strong rounded-control px-4 py-3 text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-accent h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button onClick={() => setIsOpen(false)} variant="secondary" fullWidth={false} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={isPending} fullWidth={false}>
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
