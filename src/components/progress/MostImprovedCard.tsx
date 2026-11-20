import { TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui'
import type { ImprovedExercise } from '@/lib/data/insights'

export function MostImprovedCard({ exercise }: { exercise: ImprovedExercise }) {
  return (
    <Card as="section">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="t-caption">Most improved lift</h3>
          <p className="t-title-3 mt-1 truncate">{exercise.exerciseName}</p>
          <p className="mono text-sm text-secondary mt-0.5">
            {exercise.previousBest.toFixed(1)} → {exercise.recentBest.toFixed(1)} kg e1RM
          </p>
        </div>
        <p className="flex shrink-0 items-center gap-1.5 t-value text-positive">
          <TrendingUp className="w-4 h-4" aria-hidden="true" />+{exercise.improvementPct}%
        </p>
      </div>
    </Card>
  )
}
