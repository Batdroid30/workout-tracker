import Link from 'next/link'
import { Sparkles, ArrowRight, TrendingDown, Flame, BatteryLow, Dumbbell } from 'lucide-react'
import type { Profile } from '@/types/database'

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
    headline = `${stall.exerciseName} Plateau Detected`
    contextBlurb = `e1RM has stalled around ${stall.currentBest}kg. A variation swap or rep-range cycle is recommended.`
    promptQuery = `My ${stall.exerciseName} has stalled at ${stall.currentBest}kg over recent sessions. What specific accessory adjustments or variation swaps do you recommend?`
  } else if (fatigue.shouldSuggest || fatigue.score >= 4) {
    Icon = BatteryLow
    headline = 'Recovery Deload Recommended'
    contextBlurb = `Fatigue score is elevated (${fatigue.score}/6). Muscle adaptation requires programmed deload or rest.`
    promptQuery = `My fatigue score is ${fatigue.score}/6 with signals: ${fatigue.signals.join(', ')}. How should I structure a deload or recovery session?`
  } else if (neglectedMuscles.length > 0 && neglectedMuscles[0].daysSinceLastTrained >= 5) {
    const neg = neglectedMuscles[0]
    Icon = Dumbbell
    headline = `${neg.muscleGroup.toUpperCase()} Ready for Stimulation`
    contextBlurb = `Not trained in ${neg.daysSinceLastTrained} days. Volume target is below weekly threshold.`
    promptQuery = `I haven't trained ${neg.muscleGroup} in ${neg.daysSinceLastTrained} days. What is the optimal workout or exercise combination to hit it today?`
  } else {
    Icon = Flame
    headline = `${streak.currentStreak}-Week Momentum Strong`
    contextBlurb = 'Training consistency is optimal. Ready to progress volume on your primary compounds today.'
    promptQuery = 'Review my current training split and tell me how I can optimize progressive overload for my next session.'
  }

  const coachUrl = `/coach?prompt=${encodeURIComponent(promptQuery)}`

  return (
    <div
      className="glass p-4 rounded-2xl relative overflow-hidden transition-all duration-200"
      style={{
        borderColor: 'rgba(45, 212, 191, 0.25)',
        background: 'linear-gradient(135deg, rgba(45,212,191,0.06) 0%, rgba(10,13,24,0.6) 100%)',
      }}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-teal-400">
            Coach Briefing
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-[9px] font-mono tracking-widest uppercase text-teal-400/80">
            Live AI
          </span>
        </div>
      </div>

      {/* Main Insight Content */}
      <div className="flex items-start gap-3 my-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: 'rgba(45, 212, 191, 0.1)',
            border: '1px solid rgba(45, 212, 191, 0.2)',
          }}
        >
          <Icon className="w-4 h-4 text-teal-400" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-bold text-[var(--text-hi)] truncate">
            {headline}
          </h3>
          <p className="text-[11px] text-[var(--text-faint)] leading-relaxed mt-0.5">
            {contextBlurb}
          </p>
        </div>
      </div>

      {/* Action Row */}
      <div className="mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">
          Personalized from your real training data
        </span>

        <Link
          href={coachUrl}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-teal-300 bg-teal-500/15 border border-teal-500/30 hover:bg-teal-500/25 active:scale-95 transition-all"
        >
          <span>Ask Coach</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}
