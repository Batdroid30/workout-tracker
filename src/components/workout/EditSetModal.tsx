'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateHistoricalSetAction } from '@/app/(app)/workout/[id]/actions'
import { Button } from '@/components/ui/Button'
import { useDialog } from '@/providers/DialogProvider'

interface EditSetModalProps {
  setId: string
  initialWeight: number
  initialReps: number
  children: React.ReactNode
}

export function EditSetModal({ setId, initialWeight, initialReps, children }: EditSetModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [weight, setWeight] = useState(initialWeight)
  const [reps, setReps] = useState(initialReps)
  const [isPending, startTransition] = useTransition()
  const dialog = useDialog()
  const router = useRouter()

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateHistoricalSetAction(setId, weight, reps)
        setIsOpen(false)
        router.refresh()
      } catch (err: any) {
        dialog.alert({ title: 'Error', description: err.message })
      }
    })
  }

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer hover:bg-zinc-800 rounded-md -mx-2 px-2 transition-colors">
        {children}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-6">Edit Set</h3>
            
            <div className="flex gap-4 mb-8">
              <div className="flex-1">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 text-center">Weight (kg)</label>
                <input 
                  type="number" 
                  value={weight || ''}
                  onChange={e => setWeight(Number(e.target.value))}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold text-center focus:outline-none focus:border-brand"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 text-center">Reps</label>
                <input 
                  type="number" 
                  value={reps || ''}
                  onChange={e => setReps(Number(e.target.value))}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold text-center focus:outline-none focus:border-brand"
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
