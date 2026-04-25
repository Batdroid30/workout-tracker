import { Minus } from 'lucide-react'
import { InsightCard } from './InsightCard'
import type { StalledMovement } from '@/lib/data/insights'

interface StalledMovementsCardProps {
  movements: StalledMovement[]
}

export function StalledMovementsCard({ movements }: StalledMovementsCardProps) {
  if (movements.length === 0) return null

  return (
    <InsightCard title="Stalled Movements" icon="📉" variant="warning">
      <div className="space-y-2.5">
        {movements.map(m => {
          const changePct = Math.round(((m.currentBest - m.previousBest) / m.previousBest) * 100)
          const isRegressing = changePct < 0

          return (
            <div key={m.exerciseName} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-white uppercase tracking-tight truncate">
                  {m.exerciseName}
                </p>
                <p className="text-[10px] text-[#4a5568] font-body mt-0.5">
                  {m.previousBest.toFixed(1)} → {m.currentBest.toFixed(1)} kg e1RM
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isRegressing
                  ? <Minus className="w-3 h-3 text-red-400" />
                  : <Minus className="w-3 h-3 text-[#4a5568]" />}
                <span className={`text-sm font-black tracking-tight ${isRegressing ? 'text-red-400' : 'text-[#4a5568]'}`}>
                  {changePct > 0 ? `+${changePct}%` : `${changePct}%`}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-[#4a5568] font-body mt-3">
        No meaningful progress in 3 weeks. Consider a technique reset, deload, or rep range change.
      </p>
    </InsightCard>
  )
}
