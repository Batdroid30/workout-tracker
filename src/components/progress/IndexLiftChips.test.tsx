import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { IndexLiftChips } from './IndexLiftChips'

const lifts = [
  { exerciseId: 'a', exerciseName: 'Bench Press', muscleGroup: 'chest', sessionCount: 9 },
  { exerciseId: 'b', exerciseName: 'Overhead Press', muscleGroup: 'shoulders', sessionCount: 7 },
]

describe('IndexLiftChips', () => {
  it('names the lifts you picked when you picked them', () => {
    const markup = renderToStaticMarkup(<IndexLiftChips lifts={lifts} source="picked" />)
    expect(markup).toContain('Bench Press')
    expect(markup).toContain('The lifts you picked on Progress')
    expect(markup).not.toContain('Auto-detected')
    expect(markup).toContain('9 weeks trained')
  })

  it('says when they were chosen for you', () => {
    expect(renderToStaticMarkup(<IndexLiftChips lifts={lifts} source="auto" />)).toContain('Your most-trained lifts')
  })
})
