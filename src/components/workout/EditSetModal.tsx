'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateHistoricalSetAction } from '@/app/(app)/workout/[id]/actions'
import { Button, Input } from '@/components/ui'
import { useDialog } from '@/providers/DialogProvider'

interface EditSetModalProps {
  setId: string
  initialWeight: number
  initialReps: number
  /** Weighted bodyweight lifts: the bodyweight the stored total includes. The input then edits only the added weight. */
  addedOnTopOfKg?: number
  children: React.ReactNode
}

export function EditSetModal({ setId, initialWeight, initialReps, addedOnTopOfKg, children }: EditSetModalProps) {
  const isWeighted = addedOnTopOfKg !== undefined
  const [isOpen, setIsOpen] = useState(false)
  const [weight, setWeight] = useState(
    isWeighted ? Math.max(0, Math.round((initialWeight - addedOnTopOfKg) * 10) / 10) : initialWeight,
  )
  const [reps, setReps] = useState(initialReps)
  const [isPending, startTransition] = useTransition()
  const dialog = useDialog()
  const router = useRouter()

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateHistoricalSetAction(setId, isWeighted ? addedOnTopOfKg + weight : weight, reps)
        setIsOpen(false)
        router.refresh()
      } catch (err: any) {
        dialog.alert({ title: 'Error', description: err.message })
      }
    })
  }

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer hover:bg-surface-raised rounded-md -mx-2 px-2 transition-colors">
        {children}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 animate-in fade-in duration-200">
          <div className="bg-surface-raised border border-border p-6 rounded-card shadow-[var(--shadow-overlay)] w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="t-title-2 mb-6">Edit set</h3>
            
            <div className="flex gap-4 mb-8">
              <div className="flex-1">
                <label className="block text-xs font-medium text-secondary mb-2 text-center">{isWeighted ? `Added (kg) · BW ${addedOnTopOfKg}` : 'Weight (kg)'}</label>
                <Input
                  type="number"
                  value={weight || ''}
                  onChange={e => setWeight(Number(e.target.value))}
                  className="font-bold text-center"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-secondary mb-2 text-center">Reps</label>
                <Input
                  type="number"
                  value={reps || ''}
                  onChange={e => setReps(Number(e.target.value))}
                  className="font-bold text-center"
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
