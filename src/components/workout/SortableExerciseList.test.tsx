import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DRAG_ACTIVATION, dragAnnouncements } from '@/lib/drag-config'
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
  })
})
