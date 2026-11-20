import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DRAG_ACTIVATION, DRAG_MEASURING, dragAnnouncements, followPointerY, nearestToPointer } from '@/lib/drag-config'
import { MeasuringStrategy } from '@dnd-kit/core'
import { SortableExerciseList } from './SortableExerciseList'
import type { ExerciseBlock } from '@/lib/workout-session'

const blocks: ExerciseBlock[] = [
  { id: 'a', clientIds: ['a'], label: 'Bench Press' },
  { id: 'g1', clientIds: ['b', 'c'], label: 'Superset · Incline DB Press + Cable Fly' },
  { id: 'd', clientIds: ['d'], label: 'Lateral Raise' },
]

describe('drag settings', () => {
  it('needs a deliberate hold on touch so scrolling never starts a drag', () => {
    expect(DRAG_ACTIVATION.touch).toEqual({ delay: 200, tolerance: 8 })
    expect(DRAG_ACTIVATION.mouse).toEqual({ distance: 4 })
  })

  it('re-measures while dragging, because every card collapses when a drag starts', () => {
    expect(DRAG_MEASURING.droppable.strategy).toBe(MeasuringStrategy.Always)
  })

  it('keeps the held card centred on the finger even after the list collapses', () => {
    // Pressed at y=800 on a card whose collapsed row now sits at y=135 (78px tall),
    // then moved up 60px: the row's centre must be at y=740.
    const y = followPointerY({ pointerStartY: 800, rowTop: 135, rowHeight: 78, deltaY: -60 })
    expect(135 + y + 78 / 2).toBe(740)
  })

  it('drops where the finger is, not where the card started', () => {
    const rows = [{ id: 'a', top: 100, height: 66 }, { id: 'b', top: 176, height: 66 }, { id: 'c', top: 252, height: 66 }]
    expect(nearestToPointer(580, rows)).toBe('c')
    expect(nearestToPointer(190, rows)).toBe('b')
    expect(nearestToPointer(0, rows)).toBe('a')
    expect(nearestToPointer(10, [])).toBeNull()
  })

  it('tells screen reader users what is happening', () => {
    const say = dragAnnouncements(blocks)
    expect(say.onDragStart({ active: { id: 'd' } })).toBe('Picked up Lateral Raise.')
    expect(say.onDragOver({ active: { id: 'd' }, over: { id: 'g1' } })).toBe('Moved to position 2 of 3.')
    expect(say.onDragEnd({ active: { id: 'd' }, over: { id: 'g1' } })).toBe('Dropped Lateral Raise at position 2.')
    expect(say.onDragCancel()).toBe('Move cancelled.')
  })
})

describe('SortableExerciseList', () => {
  it('gives every block a labelled handle, superset included', () => {
    const markup = renderToStaticMarkup(
      <SortableExerciseList blocks={blocks} onMove={() => {}} renderBlock={(block, handle) => <div key={block.id}>{handle}{block.label}</div>} />,
    )
    expect(markup).toContain('aria-label="Reorder Bench Press"')
    expect(markup).toContain('aria-label="Reorder Superset · Incline DB Press + Cable Fly"')
    expect(markup).toContain('aria-label="Reorder Lateral Raise"')
    expect(markup).toMatch(/aria-label="Reorder Bench Press"[^>]*class="[^"]*w-11/)
  })
})
