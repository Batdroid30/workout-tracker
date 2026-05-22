import { Flame } from 'lucide-react'
import { InsightCard } from './InsightCard'
import { calculateNutritionTargets } from '@/lib/algorithms'
import type { Profile } from '@/types/database'
import type { BodyweightPoint } from '@/lib/data/bodyweight'
import Link from 'next/link'

interface NutritionCoachCardProps {
  profile:    Profile | null
  bwHistory:  BodyweightPoint[]
  weeklyGoal: number
}

export function NutritionCoachCard({ profile, bwHistory, weeklyGoal }: NutritionCoachCardProps) {
  const latestWeight = bwHistory[0]?.weight_kg ?? null

  // Need body stats + at least one bodyweight entry to show targets
  if (
    !profile?.height_cm ||
    !profile?.age_years  ||
    !profile?.sex        ||
    latestWeight === null
  ) {
    // Only show the prompt if the user has started their training profile but
    // hasn't filled in body stats yet — avoids showing to brand-new users.
    if (!profile?.training_phase) return null

    return (
      <InsightCard
        title="Nutrition Targets"
        icon={<Flame className="w-3.5 h-3.5" style={{ color: 'var(--rose)' }} />}
        variant="neutral"
      >
        <p className="text-sm text-[var(--text-low)] leading-relaxed">
          Add your height, age, and sex in{' '}
          <Link href="/profile" className="underline" style={{ color: 'var(--accent)' }}>
            your profile
          </Link>{' '}
          to unlock calorie and protein targets.
        </p>
      </InsightCard>
    )
  }

  const targets = calculateNutritionTargets({
    weightKg:           latestWeight,
    heightCm:           profile.height_cm,
    ageYears:           profile.age_years,
    sex:                profile.sex,
    weeklyGoalSessions: weeklyGoal,
    trainingPhase:      profile.training_phase,
  })

  if (targets === null) {
    return (
      <InsightCard
        title="Nutrition Targets"
        icon={<Flame className="w-3.5 h-3.5" style={{ color: 'var(--rose)' }} />}
        variant="neutral"
      >
        <p className="text-sm text-[var(--text-low)] leading-relaxed">
          Unable to estimate targets — check your profile height, age, and weight are correct.
        </p>
      </InsightCard>
    )
  }

  const phaseLabel =
    profile.training_phase === 'bulking'  ? 'Bulk'     :
    profile.training_phase === 'cutting'  ? 'Cut'      : 'Maingain'

  const surplusLabel =
    targets.surplusDeficit > 0 ? `+${targets.surplusDeficit} surplus` :
    targets.surplusDeficit < 0 ? `${targets.surplusDeficit} deficit`  : 'maintenance'

  return (
    <InsightCard
      title="Nutrition Targets"
      icon={<Flame className="w-3.5 h-3.5" style={{ color: 'var(--rose)' }} />}
      variant="neutral"
      dismissKey="insight-nutrition-dismiss"
    >
      <div className="space-y-2.5">
        {/* Phase label */}
        <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
          {phaseLabel} phase · {latestWeight} kg bodyweight
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <StatCell
            label="Maintenance"
            value={targets.tdee.toLocaleString()}
            unit="kcal"
          />
          <StatCell
            label={phaseLabel + ' target'}
            value={targets.targetCalories.toLocaleString()}
            unit="kcal"
            highlight
          />
          <StatCell
            label="Protein"
            value={String(targets.proteinGrams)}
            unit="g/day"
          />
        </div>

        <p className="text-[10px] text-[var(--text-faint)] leading-relaxed">
          {surplusLabel !== 'maintenance'
            ? `${targets.targetCalories.toLocaleString()} kcal/day (${surplusLabel}) · ${targets.proteinGrams}g protein to preserve lean mass.`
            : `${targets.targetCalories.toLocaleString()} kcal/day at maintenance · ${targets.proteinGrams}g protein.`
          }
        </p>
        <p className="text-[9px] text-[var(--text-faint)] leading-relaxed mt-1" style={{ opacity: 0.6 }}>
          Estimate only — formulas carry ±10–15% individual variance and don't account for daily non-gym activity. Track for 2 weeks, observe your weight trend, then adjust by ±100–200 kcal as needed.
        </p>
      </div>
    </InsightCard>
  )
}

function StatCell({ label, value, unit, highlight = false }: {
  label: string
  value: string
  unit: string
  highlight?: boolean
}) {
  return (
    <div
      className="rounded-[var(--radius-inner)] p-2.5 text-center"
      style={{ background: highlight ? 'var(--accent-soft)' : 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}
    >
      <p className="mono text-base font-semibold tabular-nums leading-none mb-0.5" style={{ color: highlight ? 'var(--accent)' : 'var(--text-hi)', textShadow: highlight ? '0 0 16px var(--accent-glow)' : 'none' }}>
        {value}
      </p>
      <p className="text-[9px] text-[var(--text-faint)] uppercase tracking-wide leading-tight">{unit}</p>
      <p className="text-[8px] text-[var(--text-faint)] mt-0.5 leading-tight truncate">{label}</p>
    </div>
  )
}
