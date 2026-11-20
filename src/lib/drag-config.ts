import type { UniqueIdentifier } from '@dnd-kit/core'
import type { ExerciseBlock } from '@/lib/workout-session'

// A touch drag needs a deliberate 200ms hold that barely moves, so a scroll
// never picks a card up. A mouse drag starts after a small move.
export const DRAG_ACTIVATION = {
  touch: { delay: 200, tolerance: 8 },
  mouse: { distance: 4 },
} as const

interface AnnouncementArgs {
  active: { id: UniqueIdentifier }
  over?: { id: UniqueIdentifier } | null
}

export function dragAnnouncements(blocks: ExerciseBlock[]) {
  const labelOf = (id: UniqueIdentifier) => blocks.find(block => block.id === id)?.label ?? 'exercise'
  const positionOf = (id: UniqueIdentifier) => blocks.findIndex(block => block.id === id) + 1

  return {
    onDragStart: ({ active }: AnnouncementArgs) => `Picked up ${labelOf(active.id)}.`,
    onDragOver: ({ over }: AnnouncementArgs) => (over ? `Moved to position ${positionOf(over.id)} of ${blocks.length}.` : undefined),
    onDragEnd: ({ active, over }: AnnouncementArgs) => (over
      ? `Dropped ${labelOf(active.id)} at position ${positionOf(over.id)}.`
      : 'Move cancelled.'),
    onDragCancel: () => 'Move cancelled.',
  }
}
