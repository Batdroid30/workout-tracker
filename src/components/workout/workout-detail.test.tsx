import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/app/(app)/workout/actions', () => ({ deleteWorkoutAction: vi.fn() }))
vi.mock('@/app/(app)/workout/[id]/actions', () => ({ updateWorkoutMetaAction: vi.fn() }))

import { WorkoutActionsList } from './WorkoutActionsMenu'

describe('workout detail actions', () => {
  it('offers editing the details and deleting the workout', () => {
    const markup = renderToStaticMarkup(<WorkoutActionsList onEdit={() => {}} onDelete={() => {}} isDeleting={false} />)
    expect(markup).toContain('Edit details')
    expect(markup).toContain('Delete workout')
  })

  it('shows that a delete is in progress', () => {
    expect(renderToStaticMarkup(<WorkoutActionsList onEdit={() => {}} onDelete={() => {}} isDeleting />)).toContain('Deleting…')
  })
})
