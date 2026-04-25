import { InsightCard } from './InsightCard'
import type { NeglectedMuscle } from '@/lib/data/insights'

interface NeglectedMusclesCardProps {
  muscles: NeglectedMuscle[]
}

export function NeglectedMusclesCard({ muscles }: NeglectedMusclesCardProps) {
  if (muscles.length === 0) return null

  return (
    <InsightCard title="Neglected Muscles" icon="⚠️" variant="warning">
      <div className="space-y-2.5">
        {muscles.map(m => (
          <div key={m.muscleGroup} className="flex items-center justify-between">
            <p className="text-sm font-black text-white uppercase tracking-tight">
              {m.muscleGroup}
            </p>
            <span className="text-[10px] font-black text-orange-400">
              {m.daysSinceLastTrained}d ago
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#4a5568] font-body mt-3">
        These muscle groups haven't been trained recently. Consider adding them to your next session.
      </p>
    </InsightCard>
  )
}
