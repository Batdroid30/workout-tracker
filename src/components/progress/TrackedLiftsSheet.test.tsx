import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TrackedLiftsChoices } from './TrackedLiftsSheet'

const options = [
  { id: 'a', name: 'Bench Press', detail: 'Chest · 24 sessions', hasData: true },
  { id: 'b', name: 'Squat', detail: 'Quads · 20 sessions', hasData: true },
  { id: 'c', name: 'Pull-up', detail: 'Back · 9 sessions', hasData: false },
]

describe('TrackedLiftsChoices', () => {
  it('shows the count, the picks and one lime save', () => {
    const markup = renderToStaticMarkup(
      <TrackedLiftsChoices
        picked={['a', 'b']} options={options} query="" error={null} isSaving={false}
        onQuery={vi.fn()} dispatch={vi.fn()} onSave={vi.fn()} onUseAuto={vi.fn()}
      />,
    )
    expect(markup).toContain('2 of 6 picked')
    expect(markup).toContain('Bench Press')
    expect(markup).toContain('Use my most-trained lifts')
    expect(markup.match(/bg-accent /g)).toHaveLength(1)
  })

  it('flags lifts without weighted sets', () => {
    const markup = renderToStaticMarkup(
      <TrackedLiftsChoices
        picked={[]} options={options} query="" error={null} isSaving={false}
        onQuery={vi.fn()} dispatch={vi.fn()} onSave={vi.fn()} onUseAuto={vi.fn()}
      />,
    )
    expect(markup).toContain('No weighted sets in 12 weeks')
  })

  it('disables unpicked lifts once six are picked', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f']
    const many = [...options, ...['d', 'e', 'f', 'g'].map(id => ({ id, name: `Lift ${id}`, detail: '', hasData: true }))]
    const markup = renderToStaticMarkup(
      <TrackedLiftsChoices
        picked={six} options={many} query="" error={null} isSaving={false}
        onQuery={vi.fn()} dispatch={vi.fn()} onSave={vi.fn()} onUseAuto={vi.fn()}
      />,
    )
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Add Lift g"/)
  })
})
