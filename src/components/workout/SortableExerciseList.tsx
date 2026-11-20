'use client'

import { useState, type ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { DRAG_ACTIVATION, dragAnnouncements } from '@/lib/drag-config'
import { cn } from '@/lib/utils'
import type { ExerciseBlock } from '@/lib/workout-session'

interface SortableExerciseListProps {
  blocks: ExerciseBlock[]
  onMove: (fromBlockId: string, toBlockId: string) => void
  /** Renders one block. While any drag is running, blocks should render collapsed. */
  renderBlock: (block: ExerciseBlock, handle: ReactNode, isDragging: boolean) => ReactNode
}

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 })

export function SortableExerciseList({ blocks, onMove, renderBlock }: SortableExerciseListProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: DRAG_ACTIVATION.mouse }),
    useSensor(TouchSensor, { activationConstraint: DRAG_ACTIVATION.touch }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
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
      className="focus-ring flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-tertiary active:cursor-grabbing"
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
        isDragging && 'z-10 rounded-card shadow-[var(--shadow-overlay)] motion-safe:scale-[1.02] [&>*]:bg-surface-raised',
      )}
    >
      {renderBlock(block, handle, isDraggingAny)}
    </div>
  )
}
