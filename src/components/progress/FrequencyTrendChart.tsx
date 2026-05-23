'use client'

import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  Cell, ReferenceLine, Tooltip,
} from 'recharts'
import type { WeeklySnapshotData } from '@/lib/data/progress-snapshot'

interface FrequencyTrendChartProps {
  weeklyData:  WeeklySnapshotData[]
  weeklyGoal?: number
}

interface ChartPoint {
  label:    string
  sessions: number
  isCurrent: boolean
}

function buildChartData(weeklyData: WeeklySnapshotData[]): ChartPoint[] {
  const today   = new Date()
  const todayMs = today.getTime()

  return weeklyData.map(w => {
    // Is this the current in-progress week?
    const weekMs  = new Date(w.weekStart + 'T00:00:00Z').getTime()
    const isCurrent = weekMs <= todayMs && todayMs < weekMs + 7 * 86_400_000

    const label = new Date(w.weekStart + 'T00:00:00Z')
      .toLocaleDateString([], { month: 'short', day: 'numeric' })

    return { label, sessions: w.sessionCount, isCurrent }
  })
}

interface CustomTooltipProps {
  active?:  boolean
  payload?: { value: number }[]
  label?:   string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const sessions = payload[0].value
  return (
    <div
      className="text-xs px-2.5 py-1.5 rounded-lg"
      style={{
        background: 'var(--surface-3)',
        border:     '1px solid var(--border)',
        color:      'var(--text-hi)',
      }}
    >
      <div style={{ color: 'var(--text-lo)' }}>{label}</div>
      <div className="font-semibold mt-0.5">
        {sessions} session{sessions === 1 ? '' : 's'}
      </div>
    </div>
  )
}

export function FrequencyTrendChart({ weeklyData, weeklyGoal = 3 }: FrequencyTrendChartProps) {
  const data = buildChartData(weeklyData)

  if (data.length === 0) {
    return (
      <div className="h-[140px] flex items-center justify-center">
        <p className="t-caption">Log a few workouts to see your frequency trend.</p>
      </div>
    )
  }

  // Y-axis ceiling: at least 5 or max sessions + 1
  const maxSessions = Math.max(...data.map(d => d.sessions))
  const yMax        = Math.max(5, maxSessions + 1)

  return (
    <div className="h-[140px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: 'var(--text-lo)' }}
            tickLine={false}
            axisLine={false}
            // Show every 4th label on mobile to prevent crowding
            interval={Math.floor(data.length / 4)}
          />
          <YAxis
            tick={{ fontSize: 9, fill: 'var(--text-lo)' }}
            tickLine={false}
            axisLine={false}
            domain={[0, yMax]}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-2)', radius: 4 }} />
          {/* Weekly goal reference line */}
          <ReferenceLine
            y={weeklyGoal}
            stroke="var(--accent)"
            strokeDasharray="4 4"
            strokeOpacity={0.45}
          />
          <Bar dataKey="sessions" radius={[3, 3, 0, 0]} maxBarSize={20}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.sessions >= weeklyGoal
                    ? 'var(--accent)'
                    : entry.isCurrent
                    ? 'color-mix(in srgb, var(--accent) 55%, transparent)'
                    : 'var(--surface-3, #2a2a2a)'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
