import { Trophy } from 'lucide-react'
import { InsightCard } from './InsightCard'
import type { RecentPR } from '@/lib/data/insights'
import type { PRType } from '@/types/database'

const PR_LABELS: Record<PRType, string> = {
  best_weight: 'Best Weight',
  best_volume: 'Best Volume',
  best_1rm:    'Est. 1RM',
}

const PR_UNITS: Record<PRType, string> = {
  best_weight: 'kg',
  best_volume: 'kg',
  best_1rm:    'kg',
}

interface RecentPRsCardProps {
  prs: RecentPR[]
}

export function RecentPRsCard({ prs }: RecentPRsCardProps) {
  if (prs.length === 0) return null

  return (
    <InsightCard title="Recent PRs" icon="🏆" variant="positive">
      <div className="space-y-2.5">
        {prs.map((pr, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-sm font-black text-white uppercase tracking-tight truncate">
                {pr.exerciseName}
              </p>
              <p className="text-[10px] text-[#4a5568] font-body mt-0.5">
                {PR_LABELS[pr.prType]} · {pr.daysAgo === 0 ? 'today' : `${pr.daysAgo}d ago`}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Trophy className="w-3 h-3 text-[#CCFF00]" />
              <span className="text-sm font-black text-[#CCFF00] tracking-tight">
                {pr.prType === 'best_1rm'
                  ? pr.value.toFixed(1)
                  : pr.value}
                <span className="text-[10px] text-[#CCFF00]/60 ml-0.5">{PR_UNITS[pr.prType]}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </InsightCard>
  )
}
