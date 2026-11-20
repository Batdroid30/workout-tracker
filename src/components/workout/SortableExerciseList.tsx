'use client'

import { useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type Modifier,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS, getEventCoordinates } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { DRAG_ACTIVATION, DRAG_MEASURING, dragAnnouncements, followPointerY, nearestToPointer } from '@/lib/drag-config'
import { cn } from '@/lib/utils'
import type { ExerciseBlock } from '@/lib/workout-session'

interface SortableExerciseListProps {
  blocks: ExerciseBlock[]
  onMove: (fromBlockId: string, toBlockId: string) => void
  /** Renders one block. While any drag is running, blocks should render collapsed. */
  renderBlock: (block: ExerciseBlock, handle: ReactNode, isDragging: boolean) => ReactNode
}

// Pointer drags drop at the row nearest the finger; keyboard drags have no
// pointer and use the default.
const nearestRowToPointer: CollisionDetection = args => {
  if (!args.pointerCoordinates) return closestCenter(args)
  const rows = args.droppableContainers.flatMap(container => {
    const rect = args.droppableRects.get(container.id)
    return rect ? [{ id: container.id, top: rect.top, height: rect.height }] : []
  })
  const id = nearestToPointer(args.pointerCoordinates.y, rows)
  const container = args.droppableContainers.find(candidate => candidate.id === id)
  return container ? [{ id: container.id, data: { droppableContainer: container, value: 0 } }] : []
}

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 })

// Keeps the held row under the finger (keyboard drags have no pointer and keep the default).
const underPointer: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  const start = activatorEvent ? getEventCoordinates(activatorEvent) : null
  if (!start || !draggingNodeRect || activatorEvent instanceof KeyboardEvent) return { ...transform, x: 0 }
  return {
    ...transform,
    x: 0,
    y: followPointerY({ pointerStartY: start.y, rowTop: draggingNodeRect.top, rowHeight: draggingNodeRect.height, deltaY: transform.y }),
  }
}

export function SortableExerciseList({ blocks, onMove, renderBlock }: SortableExerciseListProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: DRAG_ACTIVATION.mouse }),
    useSensor(TouchSensor, { activationConstraint: DRAG_ACTIVATION.touch }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const activeBlock = blocks.find(block => block.id === activeId) ?? null

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={nearestRowToPointer}
      measuring={DRAG_MEASURING}
      modifiers={[verticalOnly]}
      accessibility={{ announcements: dragAnnouncements(blocks) }}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={blocks.map(block => block.id)} strategy={verticalListSortingStrategy}>
        {blocks.map(block => (
          <SortableBlock key={block.id} block={block} isDraggingAny={activeId !== null} renderBlock={renderBlock} />
        ))}
      </SortableContext>
      {/* The held card follows the finger as a collapsed row, wherever the
          collapse moved the original to. */}
      <DragOverlay dropAnimation={null} modifiers={[underPointer]}>
        {activeBlock && (
          <div className="rounded-card shadow-[var(--shadow-overlay)] motion-safe:scale-[1.02] [&>*]:bg-surface-raised">
            {renderBlock(activeBlock, <span className="flex h-11 w-11 shrink-0 items-center justify-center text-primary"><GripVertical className="h-5 w-5" aria-hidden="true" /></span>, true)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function SortableBlock({ block, isDraggingAny, renderBlock }: {
  block: ExerciseBlock
  isDraggingAny: boolean
  renderBlock: SortableExerciseListProps['renderBlock']
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={`Reorder ${block.label}`}
      className="focus-ring flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-tertiary active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-5 w-5" aria-hidden="true" />
    </button>
  )

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative',
        // The overlay is what moves; the original stays behind as the drop slot.
        isDragging && 'rounded-card border border-dashed border-border-strong [&>*]:invisible',
      )}
    >
      {renderBlock(block, handle, isDraggingAny)}
    </div>
  )
}
