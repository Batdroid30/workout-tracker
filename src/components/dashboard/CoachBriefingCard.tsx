import Link from 'next/link'
import { Sparkles, ArrowRight, TrendingDown, Flame, BatteryLow, Dumbbell } from 'lucide-react'
import type { Profile } from '@/types/database'
import { Card, getButtonClassName } from '@/components/ui'
import { cn } from '@/lib/utils'

interface CoachBriefingCardProps {
  stalledMovements: Array<{
    exerciseName: string
    currentBest: number
    pctPerWeek: number
  }>
  fatigue: {
    score: number
    shouldSuggest: boolean
    signals: string[]
  }
  neglectedMuscles: Array<{
    muscleGroup: string
    daysSinceLastTrained: number
  }>
  streak: {
    currentStreak: number
  }
  profile?: Profile | null
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function CoachBriefingCard({
  stalledMovements,
  fatigue,
  neglectedMuscles,
  streak,
}: CoachBriefingCardProps) {
  // Determine the highest priority signal to brief the athlete on
  let headline = ''
  let contextBlurb = ''
  let promptQuery = ''
  let Icon = Sparkles

  if (stalledMovements.length > 0) {
    const stall = stalledMovements[0]
    Icon = TrendingDown
    headline = `${stall.exerciseName} plateau detected`
    contextBlurb = `e1RM has stalled around ${stall.currentBest}kg. A variation swap or rep-range cycle is recommended.`
    promptQuery = `My ${stall.exerciseName} has stalled at ${stall.currentBest}kg over recent sessions. What specific accessory adjustments or variation swaps do you recommend?`
  } else if (fatigue.shouldSuggest || fatigue.score >= 4) {
    Icon = BatteryLow
    headline = 'Recovery deload recommended'
    contextBlurb = `Fatigue score is elevated (${fatigue.score}/6). Muscle adaptation requires programmed deload or rest.`
    promptQuery = `My fatigue score is ${fatigue.score}/6 with signals: ${fatigue.signals.join(', ')}. How should I structure a deload or recovery session?`
  } else if (neglectedMuscles.length > 0 && neglectedMuscles[0].daysSinceLastTrained >= 5) {
    const neg = neglectedMuscles[0]
    Icon = Dumbbell
    headline = `${capitalize(neg.muscleGroup)} ready for stimulation`
    contextBlurb = `Not trained in ${neg.daysSinceLastTrained} days. Volume target is below weekly threshold.`
    promptQuery = `I haven't trained ${neg.muscleGroup} in ${neg.daysSinceLastTrained} days. What is the optimal workout or exercise combination to hit it today?`
  } else {
    Icon = Flame
    headline = `${streak.currentStreak}-Week momentum strong`
    contextBlurb = 'Training consistency is optimal. Ready to progress volume on your primary compounds today.'
    promptQuery = 'Review my current training split and tell me how I can optimize progressive overload for my next session.'
  }

  const coachUrl = `/coach?prompt=${encodeURIComponent(promptQuery)}`

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-surface-raised text-primary">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-primary">Coach briefing</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
          <span className="text-xs font-mono text-secondary">Live AI</span>
        </div>
      </div>

      <div className="flex items-start gap-3 my-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-surface-raised">
          <Icon className="w-4 h-4 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-primary truncate">{headline}</h3>
          <p className="text-xs text-secondary leading-relaxed mt-0.5">{contextBlurb}</p>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between gap-2">
        <span className="min-w-0 text-xs text-tertiary">Personalized from your real training data</span>

        <Link
          href={coachUrl}
          className={cn(getButtonClassName({ variant: 'secondary', size: 'sm', fullWidth: false }), 'shrink-0')}
        >
          <span>Ask coach</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </Card>
  )
}
