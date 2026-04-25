import { Trophy } from 'lucide-react'
import { InsightCard } from './InsightCard'
import type { RecentPR } from '@/lib/data/insights'
import type { PRType } from '@/types/database'

const PR_LABELS: Record<PRType, string> = {
  best_weight: 'Max Weight',
  best_volume: 'Best Volume',
  best_1rm:    'Est. 1RM',
}

interface RecentPRsCardProps {
  prs: RecentPR[]
}

function formatValue(prType: PRType, value: number): string {
  if (prType === 'best_1rm') return `${value.toFixed(1)} kg`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k kg`
  return `${value} kg`
}

function recencyLabel(daysAgo: number): string {
  if (daysAgo === 0) return 'today'
  if (daysAgo === 1) return 'yesterday'
  if (daysAgo < 7)  return `${daysAgo}d ago`
  if (daysAgo < 30) return `${Math.floor(daysAgo / 7)}w ago`
  return `${Math.floor(daysAgo / 30)}mo ago`
}

export function RecentPRsCard({ prs }: RecentPRsCardProps) {
  return (
    <InsightCard title="Recent PRs" icon="🏆" variant="positive">
      {prs.length === 0 ? (
        <p className="text-[11px] text-[#334155] font-body tracking-wide">
          No PRs in the last 60 days. Time to set some records!
        </p>
      ) : (
        <div className="space-y-2.5">
          {prs.map((pr, i) => (
            <div key={i} className="flex items-center gap-3">
              {/* Recency badge */}
              <div className="shrink-0 w-12 text-center">
                <span className="text-[9px] font-black text-[#4a5568] uppercase tracking-widest">
                  {recencyLabel(pr.daysAgo)}
                </span>
              </div>

              {/* Exercise + PR type */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white uppercase tracking-tight truncate">
                  {pr.exerciseName}
                </p>
                <p className="text-[10px] text-[#4a5568] font-body mt-0.5 tracking-wide">
                  {PR_LABELS[pr.prType]}
                </p>
              </div>

              {/* Value */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Trophy className="w-3 h-3 text-[#CCFF00]" />
                <span className="text-sm font-black text-[#CCFF00] tracking-tight tabular-nums">
                  {formatValue(pr.prType, pr.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </InsightCard>
  )
}
