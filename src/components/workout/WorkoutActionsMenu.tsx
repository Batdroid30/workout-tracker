'use client'

import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { BottomSheet, Button, IconButton } from '@/components/ui'
import { EditWorkoutMetaModal } from './EditWorkoutMetaModal'
import { useDeleteWorkout } from './useDeleteWorkout'

interface WorkoutActionsMenuProps {
  workoutId: string
  title: string | null
  durationSeconds: number | null
  notes: string | null
}

interface WorkoutActionsListProps {
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

export function WorkoutActionsList({ onEdit, onDelete, isDeleting }: WorkoutActionsListProps) {
  return (
    <div className="space-y-2">
      <Button variant="secondary" onClick={onEdit}>Edit details</Button>
      <Button variant="ghost" className="text-negative hover:text-negative" onClick={onDelete} disabled={isDeleting}>
        {isDeleting ? 'Deleting…' : 'Delete workout'}
      </Button>
    </div>
  )
}

// The ⋯ in a past workout's top bar: less-used actions, out of the way.
export function WorkoutActionsMenu({ workoutId, title, durationSeconds, notes }: WorkoutActionsMenuProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const { deleteWorkout, isDeleting } = useDeleteWorkout(workoutId)

  return (
    <>
      <IconButton aria-label="More actions" onClick={() => setSheetOpen(true)}>
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </IconButton>

      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Workout">
        <WorkoutActionsList
          isDeleting={isDeleting}
          onEdit={() => { setSheetOpen(false); setEditOpen(true) }}
          onDelete={() => { setSheetOpen(false); void deleteWorkout() }}
        />
      </BottomSheet>

      <EditWorkoutMetaModal
        workoutId={workoutId}
        initialTitle={title}
        initialDuration={durationSeconds}
        initialNotes={notes}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
