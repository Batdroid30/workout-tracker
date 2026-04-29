import { TrendingDown, Minus, TrendingUp } from 'lucide-react'
import { InsightCard } from './InsightCard'
import type { StalledMovement } from '@/lib/data/insights'

interface StalledMovementsCardProps {
  movements: StalledMovement[]
}

// ─── Rate visualisation ───────────────────────────────────────────────────────
// Three buckets keep the UI honest: regressing, flat, creeping.
// "Stalled" is anything in this card by definition (the data layer already
// filtered by total change < 3% over 3 weeks), but the per-week rate lets us
// distinguish *how* stalled.

type Trend = 'regressing' | 'flat' | 'creeping'

function classifyTrend(pctPerWeek: number): Trend {
  if (pctPerWeek < -0.1) return 'regressing'
  if (pctPerWeek > 0.1)  return 'creeping'
  return 'flat'
}

const TREND_STYLES: Record<Trend, { color: string; Icon: typeof Minus }> = {
  regressing: { color: 'text-red-400',    Icon: TrendingDown },
  flat:       { color: 'text-[#4a5568]',  Icon: Minus        },
  creeping:   { color: 'text-orange-400', Icon: TrendingUp   },
}

function formatRate(pctPerWeek: number, kgPerWeek: number): string {
  const sign      = pctPerWeek >= 0 ? '+' : ''
  const absPct    = Math.abs(pctPerWeek)
  const absKg     = Math.abs(kgPerWeek)

  // Show kg/wk for small absolute changes — easier to interpret than 0.05%/wk
  if (absPct < 0.5 && absKg >= 0.05) {
    return `${sign}${kgPerWeek.toFixed(2)} kg/wk`
  }
  return `${sign}${pctPerWeek.toFixed(1)}%/wk`
}

export function StalledMovementsCard({ movements }: StalledMovementsCardProps) {
  if (movements.length === 0) return null

  return (
    <InsightCard title="Stalled Movements" icon="📉" variant="warning">
      <div className="space-y-2.5">
        {movements.map(m => {
          const trend = classifyTrend(m.pctPerWeek)
          const { color, Icon } = TREND_STYLES[trend]

          return (
            <div key={m.exerciseName} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-white uppercase tracking-tight truncate">
                  {m.exerciseName}
                </p>
                <p className="text-[10px] text-[#4a5568] font-body mt-0.5 tabular-nums">
                  {m.previousBest.toFixed(1)} → {m.currentBest.toFixed(1)} kg e1RM
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Icon className={`w-3 h-3 ${color}`} />
                <span className={`text-xs font-black tracking-tight tabular-nums ${color}`}>
                  {formatRate(m.pctPerWeek, m.kgPerWeek)}
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
