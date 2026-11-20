import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }))
vi.mock('@/providers/ToastProvider', () => ({ useToast: () => ({ error: vi.fn(), success: vi.fn() }) }))
vi.mock('@/providers/DialogProvider', () => ({ useDialog: () => ({ confirm: vi.fn() }) }))
vi.mock('@/app/(app)/routines/split-actions', () => ({
  saveSplitAction: vi.fn(),
  deleteSplitAction: vi.fn(),
  setActiveSplitAction: vi.fn(),
  setSplitPositionAction: vi.fn(),
}))

import { SplitEditor } from './SplitEditor'
import type { SplitWithItems } from '@/lib/data/splits'

const routines = [
  { id: 'push', title: 'Push A' },
  { id: 'pull', title: 'Pull A' },
]

const split: SplitWithItems = {
  id: 's1', name: 'Push pull legs', isActive: true, skip: null,
  items: [
    { id: 'a', position: 0, routineId: 'push', routineTitle: 'Push A' },
    { id: 'b', position: 1, routineId: null, routineTitle: null },
    { id: 'c', position: 2, routineId: 'pull', routineTitle: 'Pull A' },
  ],
}

const render = (value: SplitWithItems | null) =>
  renderToStaticMarkup(<SplitEditor split={value} routines={routines} />)

describe('SplitEditor', () => {
  it('lists the days in order with move and remove buttons named per day', () => {
    const markup = render(split)
    expect(markup.indexOf('Push A')).toBeLessThan(markup.indexOf('Pull A'))
    expect(markup).toContain('aria-label="Move Push A up"')
    expect(markup).toContain('aria-label="Move Pull A down"')
    expect(markup).toContain('aria-label="Remove Push A"')
  })

  it('labels rest days as Rest', () => {
    const markup = render(split)
    expect(markup).toContain('aria-label="Remove Rest"')
    expect(markup).toMatch(/>Rest</)
  })

  it('offers Start from here and Delete only on a saved split', () => {
    expect(render(split)).toContain('Start from here')
    expect(render(split)).toContain('Delete split')
    expect(render(null)).not.toContain('Start from here')
    expect(render(null)).not.toContain('Delete split')
  })

  it('makes Save the only lime control', () => {
    const markup = render(split)
    expect(markup.match(/bg-accent /g)).toHaveLength(1)
    expect(markup).toMatch(/class="[^"]*bg-accent [^"]*"[^>]*>Save</)
  })
})
