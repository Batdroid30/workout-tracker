import Link from 'next/link'
import { Flame } from 'lucide-react'
import { Card } from '@/components/ui'
import { calculateNutritionTargets } from '@/lib/algorithms'
import type { TrainingPhase } from '@/types/database'

interface NutritionTargetsCardProps {
  heightCm: number | null
  ageYears: number | null
  sex: 'male' | 'female' | null
  trainingPhase: TrainingPhase | null
  latestWeightKg: number | null
  weeklyGoal: number
}

const PHASE_LABEL: Record<TrainingPhase, string> = {
  bulking: 'Bulk',
  cutting: 'Cut',
  maingaining: 'Maingain',
}

export function NutritionTargetsCard({ heightCm, ageYears, sex, trainingPhase, latestWeightKg, weeklyGoal }: NutritionTargetsCardProps) {
  const targets = heightCm && ageYears && sex && latestWeightKg !== null
    ? calculateNutritionTargets({ weightKg: latestWeightKg, heightCm, ageYears, sex, weeklyGoalSessions: weeklyGoal, trainingPhase })
    : null

  return (
    <Card as="section">
      <div className="flex items-center justify-between">
        <h3 className="t-title-3">Nutrition targets</h3>
        <Flame className="w-4 h-4 text-caution" aria-hidden="true" />
      </div>
      {targets && latestWeightKg !== null ? (
        <>
          <p className="t-caption mt-1">{PHASE_LABEL[trainingPhase ?? 'maingaining']} phase · {latestWeightKg} kg</p>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <dd className="t-value">{targets.targetCalories.toLocaleString('en-GB')}</dd>
              <dt className="t-caption">kcal/day</dt>
            </div>
            <div>
              <dd className="t-value">{targets.proteinGrams}g</dd>
              <dt className="t-caption">protein/day</dt>
            </div>
          </dl>
        </>
      ) : (
        <p className="t-body-sm mt-1">
          Add your height, age, sex and a bodyweight in{' '}
          <Link href="/account" className="font-medium text-primary underline underline-offset-4">your account</Link>{' '}
          to get calorie and protein targets.
        </p>
      )}
    </Card>
  )
}
