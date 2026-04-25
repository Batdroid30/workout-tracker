import { InsightCard } from './InsightCard'
import type { Badge } from '@/lib/data/achievements'

interface BadgesCardProps {
  badges: Badge[]
}

export function BadgesCard({ badges }: BadgesCardProps) {
  const earned  = badges.filter(b => b.earned)
  const locked  = badges.filter(b => !b.earned)

  return (
    <InsightCard title="Achievements" icon="🏅" variant="positive">
      <p className="text-[10px] text-[#4a5568] font-body mb-3 tracking-wide">
        {earned.length} / {badges.length} unlocked
      </p>

      {/* Earned badges */}
      {earned.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {earned.map(badge => (
            <div
              key={badge.id}
              className="flex items-center gap-1.5 bg-[#CCFF00]/10 border border-[#CCFF00]/20 rounded-lg px-2.5 py-1.5"
              title={badge.description}
            >
              <span className="text-sm leading-none">{badge.emoji}</span>
              <span className="text-[10px] font-black text-[#CCFF00] uppercase tracking-wider whitespace-nowrap">
                {badge.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Next unlockable badges — show up to 3 */}
      {locked.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {locked.slice(0, 3).map(badge => (
            <div
              key={badge.id}
              className="flex items-center gap-1.5 bg-[#0c1324] border border-[#1e293b] rounded-lg px-2.5 py-1.5 opacity-50"
              title={badge.description}
            >
              <span className="text-sm leading-none grayscale">{badge.emoji}</span>
              <span className="text-[10px] font-black text-[#4a5568] uppercase tracking-wider whitespace-nowrap">
                {badge.label}
              </span>
            </div>
          ))}
          {locked.length > 3 && (
            <div className="flex items-center px-2.5 py-1.5">
              <span className="text-[10px] text-[#334155] font-black">+{locked.length - 3} more</span>
            </div>
          )}
        </div>
      )}

      {earned.length === 0 && (
        <p className="text-[11px] text-[#334155] font-body">Complete your first workout to start earning badges.</p>
      )}
    </InsightCard>
  )
}
