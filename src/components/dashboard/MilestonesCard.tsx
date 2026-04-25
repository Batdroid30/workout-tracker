import { InsightCard } from './InsightCard'

const MILESTONES = [
  { threshold:        1_000, label: '1k Club'   },
  { threshold:        5_000, label: '5k Club'   },
  { threshold:       10_000, label: '10k Club'  },
  { threshold:       25_000, label: '25k Club'  },
  { threshold:       50_000, label: '50k Club'  },
  { threshold:      100_000, label: '100k Club' },
  { threshold:      250_000, label: '250k Club' },
  { threshold:      500_000, label: '500k Club' },
  { threshold:    1_000_000, label: '1M Club'   },
] as const

function formatVolume(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}M`
  if (kg >= 1_000)     return `${(kg / 1_000).toFixed(1)}k`
  return String(kg)
}

interface MilestonesCardProps {
  totalVolume: number
}

export function MilestonesCard({ totalVolume }: MilestonesCardProps) {
  const achieved = MILESTONES.filter(m => totalVolume >= m.threshold)
  const next     = MILESTONES.find(m => totalVolume < m.threshold)
  const previous = achieved[achieved.length - 1]

  const progressPct = next && previous
    ? Math.min(100, Math.round(((totalVolume - previous.threshold) / (next.threshold - previous.threshold)) * 100))
    : next
      ? Math.min(100, Math.round((totalVolume / next.threshold) * 100))
      : 100

  return (
    <InsightCard title="Lifetime Tonnage" icon="🏋️" variant="neutral">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-3xl font-black text-white tracking-tighter">
            {formatVolume(totalVolume)}
            <span className="text-sm text-[#4a5568] ml-1 font-bold">kg lifted</span>
          </p>
          {achieved.length > 0 && (
            <p className="text-[10px] font-black text-[#CCFF00] uppercase tracking-widest mt-1">
              ✦ {achieved[achieved.length - 1].label} achieved
            </p>
          )}
        </div>
      </div>

      {next && (
        <>
          <div className="flex justify-between text-[9px] font-black text-[#334155] uppercase tracking-widest mb-1.5">
            <span>Next: {next.label}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-[#151b2d] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#CCFF00] rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-[#4a5568] font-body mt-1.5">
            {formatVolume(next.threshold - totalVolume)} kg to go
          </p>
        </>
      )}

      {!next && (
        <p className="text-[10px] font-black text-[#CCFF00] uppercase tracking-widest">
          All milestones achieved 🚀
        </p>
      )}
    </InsightCard>
  )
}
