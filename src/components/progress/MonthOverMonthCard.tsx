import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { WeeklySnapshotData } from '@/lib/data/progress-snapshot'

interface MonthOverMonthCardProps {
  weeklyData: WeeklySnapshotData[]
}

interface MonthBucket {
  volume:   number
  sessions: number
}

function groupByMonth(weeklyData: WeeklySnapshotData[]): Map<string, MonthBucket> {
  const map = new Map<string, MonthBucket>()
  for (const w of weeklyData) {
    // Use the first 7 days of the week to assign it to a month
    const month = w.weekStart.slice(0, 7)   // YYYY-MM
    const existing = map.get(month) ?? { volume: 0, sessions: 0 }
    map.set(month, {
      volume:   existing.volume   + w.totalVolume,
      sessions: existing.sessions + w.sessionCount,
    })
  }
  return map
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

interface DeltaChipProps {
  pct: number | null
  label: string
}

function DeltaChip({ pct, label }: DeltaChipProps) {
  if (pct === null) return (
    <span className="t-caption">{label} <span style={{ color: 'var(--text-lo)' }}>—</span></span>
  )

  const isUp   = pct > 0
  const isFlat = pct === 0
  const color  = isFlat ? 'var(--text-lo)' : isUp ? 'var(--accent)' : 'var(--error, #f87171)'
  const Icon   = isFlat ? Minus : isUp ? TrendingUp : TrendingDown

  return (
    <span className="t-caption flex items-center gap-1">
      {label}
      <span className="flex items-center gap-0.5 font-semibold" style={{ color }}>
        <Icon className="w-3 h-3" />
        {isUp ? '+' : ''}{pct}%
      </span>
    </span>
  )
}

export function MonthOverMonthCard({ weeklyData }: MonthOverMonthCardProps) {
  const byMonth   = groupByMonth(weeklyData)
  const months    = Array.from(byMonth.keys()).sort()

  if (months.length < 2) return null

  const thisMonth = months[months.length - 1]
  const prevMonth = months[months.length - 2]
  const current   = byMonth.get(thisMonth)!
  const previous  = byMonth.get(prevMonth)!

  const volumePct   = pctChange(current.volume,   previous.volume)
  const sessionsPct = pctChange(current.sessions, previous.sessions)

  const thisLabel = new Date(thisMonth + '-01').toLocaleDateString([], { month: 'long' })
  const prevLabel = new Date(prevMonth + '-01').toLocaleDateString([], { month: 'short' })

  const formattedVol = (kg: number) =>
    kg >= 1000 ? `${(kg / 1000).toFixed(1)}k` : String(Math.round(kg))

  return (
    <div
      className="glass p-4"
      style={{ borderColor: 'var(--accent-line)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="t-display-s">{thisLabel}</h3>
        <span className="t-caption" style={{ color: 'var(--text-lo)' }}>vs {prevLabel}</span>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="t-label mb-0.5">Volume</div>
          <div
            className="mono text-xl font-semibold"
            style={{ color: 'var(--text-hi)' }}
          >
            {formattedVol(current.volume)}
            <span className="text-xs ml-0.5" style={{ color: 'var(--text-lo)' }}>kg</span>
          </div>
          <DeltaChip pct={volumePct} label="" />
        </div>

        <div className="w-px self-stretch" style={{ background: 'var(--border)' }} />

        <div className="flex-1">
          <div className="t-label mb-0.5">Sessions</div>
          <div
            className="mono text-xl font-semibold"
            style={{ color: 'var(--text-hi)' }}
          >
            {current.sessions}
          </div>
          <DeltaChip pct={sessionsPct} label="" />
        </div>
      </div>
    </div>
  )
}
