import Link from 'next/link'
import { Sparkles, ArrowRight, Zap, Target } from 'lucide-react'

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
      className="glass p-4 rounded-2xl relative overflow-hidden"
      style={{
        borderColor: 'rgba(45, 212, 191, 0.25)',
        background: 'linear-gradient(135deg, rgba(45,212,191,0.06) 0%, rgba(10,13,24,0.7) 100%)',
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-teal-400">
            Workout Insight
          </span>
        </div>

        {prCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded-full border border-teal-500/30">
            <Zap className="w-3 h-3 text-teal-400" />
            {prCount} PR{prCount > 1 ? 's' : ''} Hit
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400">
            <Target className="w-3 h-3 text-zinc-500" />
            Volume Accumulation
          </span>
        )}
      </div>

      <p className="text-[12px] text-[var(--text-hi)] font-medium leading-relaxed">
        {prCount > 0
          ? `High-intensity output with ${prCount} personal record${prCount > 1 ? 's' : ''}. Strong progressive overload signal on compound movements.`
          : `Solid stimulus accumulation across ${totalSets} working sets. Focus on protein synthesis window and 48h recovery for ${musclesSummary}.`}
      </p>

      <div className="mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">
          Want personalized recovery guidance?
        </span>
        <Link
          href={`/coach?prompt=${encodeURIComponent(promptText)}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-teal-300 bg-teal-500/15 border border-teal-500/30 hover:bg-teal-500/25 active:scale-95 transition-all"
        >
          <span>Ask Coach</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}
