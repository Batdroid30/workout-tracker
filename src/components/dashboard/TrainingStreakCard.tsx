import { InsightCard } from './InsightCard'
import type { TrainingStreak } from '@/lib/data/insights'

interface TrainingStreakCardProps {
  streak: TrainingStreak
}

export function TrainingStreakCard({ streak }: TrainingStreakCardProps) {
  const { currentStreak, longestStreak } = streak

  return (
    <InsightCard title="Training Streak" icon="🔥" variant={currentStreak >= 4 ? 'positive' : 'neutral'}>
      {currentStreak === 0 ? (
        <p className="text-sm text-[#4a5568] font-body">Start your streak — log a workout this week!</p>
      ) : (
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-black text-white tracking-tighter">
              {currentStreak}
              <span className="text-base text-[#4a5568] ml-1.5 font-bold">
                {currentStreak === 1 ? 'week' : 'weeks'}
              </span>
            </p>
            <p className="text-[9px] font-black text-[#4a5568] uppercase tracking-widest mt-1">Current streak</p>
          </div>
          {longestStreak > 0 && (
            <div className="text-right">
              <p className="text-lg font-black text-[#334155] tracking-tight">{longestStreak}</p>
              <p className="text-[9px] font-black text-[#334155] uppercase tracking-widest">Best ever</p>
            </div>
          )}
        </div>
      )}

      {/* Visual streak dots — last 8 weeks */}
      <StreakDots current={currentStreak} longest={longestStreak} />
    </InsightCard>
  )
}

function StreakDots({ current, longest }: { current: number; longest: number }) {
  if (current === 0 && longest === 0) return null
  const dots = Array.from({ length: 8 }, (_, i) => i < current)

  return (
    <div className="flex gap-1.5 mt-3 pt-3 border-t border-[#1e293b]">
      {dots.map((active, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            active ? 'bg-[#CCFF00]' : 'bg-[#151b2d]'
          }`}
        />
      ))}
    </div>
  )
}
