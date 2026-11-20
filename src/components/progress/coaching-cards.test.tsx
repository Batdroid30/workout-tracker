import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NutritionTargetsCard } from './NutritionTargetsCard'
import { MostImprovedCard } from './MostImprovedCard'

const stats = { heightCm: 178, ageYears: 30, sex: 'male' as const, trainingPhase: 'bulking' as const }

describe('NutritionTargetsCard', () => {
  it('shows daily calories and protein for the current phase', () => {
    const markup = renderToStaticMarkup(<NutritionTargetsCard {...stats} latestWeightKg={80} weeklyGoal={4} />)
    expect(markup).toContain('Nutrition targets')
    expect(markup).toContain('kcal/day')
    expect(markup).toMatch(/\d+g/)
    expect(markup).toContain('Bulk phase · 80 kg')
  })

  it('asks for profile details it needs', () => {
    const markup = renderToStaticMarkup(<NutritionTargetsCard {...stats} heightCm={null} latestWeightKg={80} weeklyGoal={4} />)
    expect(markup).toContain('href="/account"')
    expect(markup).not.toContain('kcal/day')
  })
})

describe('MostImprovedCard', () => {
  it('names the lift and its gain', () => {
    const markup = renderToStaticMarkup(
      <MostImprovedCard exercise={{ exerciseName: 'Squat', muscleGroup: 'quads', improvementPct: 8, previousBest: 120, recentBest: 129.6 }} />,
    )
    expect(markup).toContain('Most improved lift')
    expect(markup).toContain('Squat')
    expect(markup).toContain('120.0 → 129.6 kg e1RM')
    expect(markup).toContain('+8%')
  })
})
