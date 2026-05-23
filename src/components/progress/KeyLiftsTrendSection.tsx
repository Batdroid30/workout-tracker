'use client'

import {
  LineChart, Line, ResponsiveContainer, Tooltip,
} from 'recharts'

// Serializable shape built server-side from snapshot.exerciseWeeklyE1RM
export interface KeyLiftTrendData {
  exerciseId:   string
  exerciseName: string
  muscleGroup:  string
  weeklyE1RM:   { weekStart: string; e1rm: number }[]  // sorted ascending
}

interface KeyLiftsTrendSectionProps {
  lifts: KeyLiftTrendData[]
}

interface SparklineTooltipProps {
  active?:  boolean
  payload?: { value: number }[]
  label?:   string
}

function SparklineTooltip({ active, payload, label }: SparklineTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="text-xs px-2 py-1 rounded-lg"
      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-hi)' }}
    >
      <div style={{ color: 'var(--text-lo)' }}>
        {label ? new Date(label + 'T00:00:00Z').toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
      </div>
      <div className="font-semibold">{payload[0].value.toFixed(1)} kg e1RM</div>
    </div>
  )
}

interface LiftCardProps {
  lift: KeyLiftTrendData
}

function LiftCard({ lift }: LiftCardProps) {
  const data = lift.weeklyE1RM
  if (data.length < 2) return null

  const first  = data[0].e1rm
  const latest = data[data.length - 1].e1rm
  const delta  = latest - first
  const deltaLabel = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kg`
  const isUp   = delta > 0.5
  const isDown = delta < -0.5

  const trendColor = isUp
    ? 'var(--accent)'
    : isDown
    ? 'var(--error, #f87171)'
    : 'var(--text-lo)'

  return (
    <div
      className="glass p-3 flex-shrink-0 w-[160px]"
      style={{ borderColor: isUp ? 'var(--accent-line)' : 'var(--border)' }}
    >
      {/* Header */}
      <div className="mb-2">
        <div
          className="text-[10px] font-medium uppercase tracking-wide truncate"
          style={{ color: 'var(--text-lo)' }}
        >
          {lift.muscleGroup}
        </div>
        <div
          className="text-[13px] font-semibold leading-tight truncate mt-0.5"
          style={{ color: 'var(--text-hi)' }}
        >
          {lift.exerciseName}
        </div>
      </div>

      {/* Sparkline */}
      <div className="h-[52px] w-full mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Tooltip content={<SparklineTooltip />} />
            <Line
              type="monotone"
              dataKey="e1rm"
              stroke={trendColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: trendColor }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="flex items-baseline justify-between">
        <span className="mono text-sm font-semibold" style={{ color: 'var(--text-hi)' }}>
          {latest.toFixed(1)}<span className="text-[10px] ml-0.5" style={{ color: 'var(--text-lo)' }}>kg</span>
        </span>
        <span className="text-[11px] font-medium mono" style={{ color: trendColor }}>
          {deltaLabel}
        </span>
      </div>
    </div>
  )
}

export function KeyLiftsTrendSection({ lifts }: KeyLiftsTrendSectionProps) {
  const validLifts = lifts.filter(l => l.weeklyE1RM.length >= 2)

  if (validLifts.length === 0) {
    return (
      <div className="glass p-4 flex items-center justify-center h-[120px]">
        <p className="t-caption text-center">
          Log at least 2 weeks of compound lifts to see e1RM trends.
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      {validLifts.map(lift => (
        <LiftCard key={lift.exerciseId} lift={lift} />
      ))}
    </div>
  )
}
