import Link from 'next/link'
import { Sparkles, ArrowRight, Zap, Target } from 'lucide-react'
import { Chip, getButtonClassName } from '@/components/ui'

interface WorkoutCoachInsightCardProps {
  workoutTitle?: string | null
  workoutVolume: number
  totalSets: number
  prCount: number
  muscleGroups: string[]
  durationSeconds?: number | null
}

export function WorkoutCoachInsightCard({
  workoutTitle,
  workoutVolume,
  totalSets,
  prCount,
  muscleGroups,
  durationSeconds,
}: WorkoutCoachInsightCardProps) {
  const durationMin = durationSeconds ? Math.round(durationSeconds / 60) : 0
  const formattedVol = workoutVolume >= 1000 ? `${(workoutVolume / 1000).toFixed(1)}k` : `${Math.round(workoutVolume)}`
  const musclesSummary = muscleGroups.length > 0 ? muscleGroups.join(', ') : 'full body'

  // Formulate a prompt for deeper coach inquiry
  const promptText = `Analyze my "${workoutTitle || 'Workout'}" session: ${totalSets} working sets, ${formattedVol}kg total volume in ${durationMin}m targeting ${musclesSummary}${prCount > 0 ? ` with ${prCount} PRs` : ''}. How should I manage recovery before training these muscles again?`

  return (
    <div
      className="card p-4 relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-surface-raised text-secondary">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-secondary">
            Workout insight
          </span>
        </div>

        {prCount > 0 ? (
          <Chip tone="accent" icon={<Zap className="w-3 h-3" />}>
            {prCount} PR{prCount > 1 ? 's' : ''} hit
          </Chip>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-mono text-secondary">
            <Target className="w-3 h-3 text-tertiary" />
            Volume accumulation
          </span>
        )}
      </div>

      <p className="text-sm text-primary font-medium leading-relaxed">
        {prCount > 0
          ? `High-intensity output with ${prCount} personal record${prCount > 1 ? 's' : ''}. Strong progressive overload signal on compound movements.`
          : `Solid stimulus accumulation across ${totalSets} working sets. Focus on protein synthesis window and 48h recovery for ${musclesSummary}.`}
      </p>

      <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between gap-2">
        <span className="text-xs text-tertiary">
          Want personalized recovery guidance?
        </span>
        <Link
          href={`/coach?prompt=${encodeURIComponent(promptText)}`}
          className={getButtonClassName({ variant: 'secondary', size: 'sm', fullWidth: false })}
        >
          <span>Ask Coach</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}
