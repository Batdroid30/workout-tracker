import { MeasuringStrategy, type UniqueIdentifier } from '@dnd-kit/core'
import type { ExerciseBlock } from '@/lib/workout-session'

// A touch drag needs a deliberate 200ms hold that barely moves, so a scroll
// never picks a card up. A mouse drag starts after a small move.
export const DRAG_ACTIVATION = {
  touch: { delay: 200, tolerance: 8 },
  mouse: { distance: 4 },
} as const

// Every card collapses the moment a drag starts, so positions must be
// re-measured during the drag, not only before it.
export const DRAG_MEASURING = { droppable: { strategy: MeasuringStrategy.Always } } as const

// Where the held row is drawn, as an offset from its measured top: centred on
// the finger, so it can't drift when the cards above it collapse.
export function followPointerY({ pointerStartY, rowTop, rowHeight, deltaY }: {
  pointerStartY: number
  rowTop: number
  rowHeight: number
  deltaY: number
}): number {
  return pointerStartY + deltaY - rowTop - rowHeight / 2
}

// The drop slot is the row whose centre is nearest the finger.
export function nearestToPointer<Id>(pointerY: number, rows: { id: Id; top: number; height: number }[]): Id | null {
  let best: { id: Id; distance: number } | null = null
  for (const row of rows) {
    const distance = Math.abs(row.top + row.height / 2 - pointerY)
    if (!best || distance < best.distance) best = { id: row.id, distance }
  }
  return best?.id ?? null
}

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
