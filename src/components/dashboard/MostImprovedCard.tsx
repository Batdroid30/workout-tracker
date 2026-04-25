import { TrendingUp } from 'lucide-react'
import { InsightCard } from './InsightCard'
import type { ImprovedExercise } from '@/lib/data/insights'

const RANK_LABELS = ['1st', '2nd', '3rd'] as const

interface MostImprovedCardProps {
  exercises: ImprovedExercise[]
}

export function MostImprovedCard({ exercises }: MostImprovedCardProps) {
  if (exercises.length === 0) return null

  return (
    <InsightCard title="Most Improved" icon="📈" variant="positive">
      <div className="space-y-3">
        {exercises.map((ex, i) => (
          <div key={ex.exerciseName} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[9px] font-black text-[#334155] uppercase tracking-widest shrink-0 w-5">
                {RANK_LABELS[i]}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-white uppercase tracking-tight truncate">
                  {ex.exerciseName}
                </p>
                <p className="text-[10px] text-[#4a5568] font-body mt-0.5">
                  {ex.previousBest.toFixed(1)} → {ex.recentBest.toFixed(1)} kg e1RM
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <TrendingUp className="w-3 h-3 text-[#CCFF00]" />
              <span className="text-sm font-black text-[#CCFF00] tracking-tight">
                +{ex.improvementPct}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </InsightCard>
  )
}
