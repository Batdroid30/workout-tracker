import { InsightCard } from './InsightCard'
import type { WeeklySummary } from '@/lib/data/insights'

interface WeeklySummaryCardProps {
  data: WeeklySummary
}

function Delta({ value, unit = '' }: { value: number | null; unit?: string }) {
  if (value === null) return <span className="text-[#334155] text-[10px]">—</span>
  if (value === 0) return <span className="text-[#4a5568] text-[10px] font-black">→ same</span>

  const isPositive = value > 0
  const colour = isPositive ? 'text-[#CCFF00]' : 'text-red-400'
  const arrow = isPositive ? '↑' : '↓'
  const display = unit === '%' ? `${Math.abs(value)}%` : `${Math.abs(value)}${unit}`

  return (
    <span className={`text-[10px] font-black ${colour}`}>
      {arrow} {display} vs last week
    </span>
  )
}

export function WeeklySummaryCard({ data }: WeeklySummaryCardProps) {
  const { thisWeekVolume, thisWeekCount, volumeChangePct, countChange } = data

  const hasNoActivity = thisWeekCount === 0 && data.lastWeekCount === 0

  return (
    <InsightCard title="This Week" icon="📅" variant="neutral">
      {hasNoActivity ? (
        <p className="text-sm text-[#4a5568] font-body">No workouts logged yet. Start your first session!</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xl font-black text-white tracking-tight">
              {thisWeekVolume >= 1000
                ? `${(thisWeekVolume / 1000).toFixed(1)}k`
                : thisWeekVolume}
              <span className="text-xs text-[#4a5568] ml-0.5 font-bold">kg</span>
            </p>
            <p className="text-[9px] font-black text-[#4a5568] uppercase tracking-widest mt-0.5 mb-1">Volume</p>
            <Delta value={volumeChangePct} unit="%" />
          </div>
          <div>
            <p className="text-2xl font-black text-white tracking-tight">{thisWeekCount}</p>
            <p className="text-[9px] font-black text-[#4a5568] uppercase tracking-widest mt-0.5 mb-1">Sessions</p>
            <Delta value={countChange} unit={Math.abs(countChange ?? 0) === 1 ? ' session' : ' sessions'} />
          </div>
        </div>
      )}
    </InsightCard>
  )
}
