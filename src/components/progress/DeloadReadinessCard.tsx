import { Shield, AlertTriangle, TrendingDown } from 'lucide-react'
import type { WeeklySnapshotData } from '@/lib/data/progress-snapshot'

interface DeloadReadinessCardProps {
  weeklyData:      WeeklySnapshotData[]
  staleLiftsCount: number
}

type ReadinessStatus = 'fresh' | 'monitor' | 'deload'

interface ReadinessSignals {
  recentAvgRpe:   number | null
  prevAvgRpe:     number | null
  densitySlope:   number | null   // positive = gaining, negative = declining
  hasEnoughData:  boolean
}

function computeSignals(weeklyData: WeeklySnapshotData[]): ReadinessSignals {
  const trained = weeklyData.filter(w => w.sessionCount > 0)
  if (trained.length < 4) {
    return { recentAvgRpe: null, prevAvgRpe: null, densitySlope: null, hasEnoughData: false }
  }

  const recent = trained.slice(-3)
  const prev   = trained.slice(-6, -3)

  // Average RPE
  const rpeAvg = (weeks: WeeklySnapshotData[]): number | null => {
    const vals = weeks.filter(w => w.avgRpe !== null).map(w => w.avgRpe as number)
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  }

  // Density slope — compare recent 3-week avg vs previous 3-week avg
  const densityAvg = (weeks: WeeklySnapshotData[]): number => {
    const vals = weeks.filter(w => w.density > 0).map(w => w.density)
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
  }
  const recentDensity = densityAvg(recent)
  const prevDensity   = densityAvg(prev)
  const densitySlope  = prevDensity > 0
    ? (recentDensity - prevDensity) / prevDensity * 100
    : null

  return {
    recentAvgRpe:  rpeAvg(recent),
    prevAvgRpe:    rpeAvg(prev),
    densitySlope,
    hasEnoughData: true,
  }
}

function classifyStatus(
  signals: ReadinessSignals,
  staleLiftsCount: number,
): ReadinessStatus {
  if (!signals.hasEnoughData) return 'fresh'

  let score = 0

  if (signals.recentAvgRpe !== null) {
    if (signals.recentAvgRpe > 8.5) score += 2
    else if (signals.recentAvgRpe > 7.5) score += 1
  }
  if (signals.densitySlope !== null && signals.densitySlope < -10) score += 2
  else if (signals.densitySlope !== null && signals.densitySlope < -5) score += 1

  score += Math.min(staleLiftsCount, 2)

  if (score >= 4) return 'deload'
  if (score >= 2) return 'monitor'
  return 'fresh'
}

const STATUS_CONFIG: Record<ReadinessStatus, {
  label:      string
  sub:        string
  color:      string
  bgColor:    string
  borderColor: string
  Icon:       typeof Shield
}> = {
  fresh: {
    label:       'Fresh — Keep Pushing',
    sub:         'Recovery indicators look good. Stay consistent.',
    color:       'var(--accent)',
    bgColor:     'var(--accent-soft)',
    borderColor: 'var(--accent-line)',
    Icon:        Shield,
  },
  monitor: {
    label:       'Monitor Closely',
    sub:         'Some fatigue signals detected. Watch your RPE this week.',
    color:       '#f59e0b',
    bgColor:     'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.25)',
    Icon:        AlertTriangle,
  },
  deload: {
    label:       'Consider a Deload',
    sub:         'Multiple fatigue signals. A lighter week may boost long-term progress.',
    color:       'var(--error, #f87171)',
    bgColor:     'rgba(248,113,113,0.1)',
    borderColor: 'rgba(248,113,113,0.25)',
    Icon:        TrendingDown,
  },
}

export function DeloadReadinessCard({ weeklyData, staleLiftsCount }: DeloadReadinessCardProps) {
  const signals  = computeSignals(weeklyData)
  const status   = classifyStatus(signals, staleLiftsCount)
  const config   = STATUS_CONFIG[status]
  const { Icon } = config

  return (
    <div
      className="glass p-4"
      style={{ borderColor: config.borderColor }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-[var(--radius-inner)] flex items-center justify-center shrink-0"
          style={{ background: config.bgColor, border: `1px solid ${config.borderColor}` }}
        >
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold" style={{ color: config.color }}>
            {config.label}
          </div>
          <p className="t-caption mt-0.5">{config.sub}</p>
        </div>
      </div>

      {/* Signal breakdown */}
      {signals.hasEnoughData && (
        <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--border)' }}>
          {signals.recentAvgRpe !== null && (
            <div className="flex items-center justify-between">
              <span className="t-caption">Avg RPE (last 3 weeks)</span>
              <span
                className="mono text-[11px] font-semibold"
                style={{ color: signals.recentAvgRpe > 8.5 ? 'var(--error, #f87171)' : signals.recentAvgRpe > 7.5 ? '#f59e0b' : 'var(--accent)' }}
              >
                {signals.recentAvgRpe.toFixed(1)}
              </span>
            </div>
          )}
          {signals.densitySlope !== null && (
            <div className="flex items-center justify-between">
              <span className="t-caption">Volume/session trend</span>
              <span
                className="mono text-[11px] font-semibold"
                style={{ color: signals.densitySlope < -10 ? 'var(--error, #f87171)' : signals.densitySlope < -5 ? '#f59e0b' : 'var(--accent)' }}
              >
                {signals.densitySlope >= 0 ? '+' : ''}{signals.densitySlope.toFixed(1)}%
              </span>
            </div>
          )}
          {staleLiftsCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="t-caption">Stalled lifts</span>
              <span
                className="mono text-[11px] font-semibold"
                style={{ color: staleLiftsCount >= 3 ? 'var(--error, #f87171)' : staleLiftsCount >= 1 ? '#f59e0b' : 'var(--accent)' }}
              >
                {staleLiftsCount}
              </span>
            </div>
          )}
          {signals.recentAvgRpe === null && (
            <p className="t-caption" style={{ color: 'var(--text-lo)' }}>
              Log RPE on your sets for a more accurate readiness signal.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
