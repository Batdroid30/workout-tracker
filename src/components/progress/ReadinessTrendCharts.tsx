'use client'

import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
  ReferenceLine,
} from 'recharts'
import type { WeeklySnapshotData } from '@/lib/data/progress-snapshot'

interface ReadinessTrendChartsProps {
  weeklyData: WeeklySnapshotData[]
}

interface ChartPoint {
  label:   string
  density: number
  rpe:     number | null
}

function buildChartData(weeklyData: WeeklySnapshotData[]): ChartPoint[] {
  return weeklyData
    .filter(w => w.sessionCount > 0)
    .slice(-12)
    .map(w => ({
      label:   new Date(w.weekStart + 'T00:00:00Z')
        .toLocaleDateString([], { month: 'short', day: 'numeric' }),
      density: Math.round(w.density),
      rpe:     w.avgRpe !== null ? Number(w.avgRpe.toFixed(1)) : null,
    }))
}

interface CustomTooltipProps {
  active?:  boolean
  payload?: { value: number | null; dataKey: string }[]
  label?:   string
}

function DensityTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  if (val == null) return null
  return (
    <div
      className="text-xs px-2.5 py-1.5 rounded-lg"
      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-hi)' }}
    >
      <div style={{ color: 'var(--text-lo)' }}>{label}</div>
      <div className="font-semibold">{val.toLocaleString()} kg/session</div>
    </div>
  )
}

function RPETooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  if (val == null) return null
  return (
    <div
      className="text-xs px-2.5 py-1.5 rounded-lg"
      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-hi)' }}
    >
      <div style={{ color: 'var(--text-lo)' }}>{label}</div>
      <div className="font-semibold">RPE {val}</div>
    </div>
  )
}

export function ReadinessTrendCharts({ weeklyData }: ReadinessTrendChartsProps) {
  const data = buildChartData(weeklyData)
  const hasRPE = data.some(d => d.rpe !== null)

  if (data.length < 2) {
    return (
      <div className="h-[80px] flex items-center justify-center">
        <p className="t-caption">Log more sessions to see readiness trends.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Training density */}
      <div>
        <div className="t-label mb-2">Volume / Session</div>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'var(--text-lo)' }}
                tickLine={false}
                axisLine={false}
                interval={Math.floor(data.length / 3)}
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'var(--text-lo)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip content={<DensityTooltip />} />
              <Line
                type="monotone"
                dataKey="density"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 3, fill: 'var(--accent)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RPE trend — only shown when at least some data exists */}
      {hasRPE && (
        <div>
          <div className="t-label mb-2">Avg RPE</div>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: 'var(--text-lo)' }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(data.length / 3)}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: 'var(--text-lo)' }}
                  tickLine={false}
                  axisLine={false}
                  domain={[5, 10]}
                  ticks={[5, 6, 7, 8, 9, 10]}
                />
                <Tooltip content={<RPETooltip />} />
                {/* Hard effort reference lines */}
                <ReferenceLine
                  y={8.5}
                  stroke="var(--error, #f87171)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
                <ReferenceLine
                  y={7.5}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                />
                <Line
                  type="monotone"
                  dataKey="rpe"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  activeDot={{ r: 3, fill: 'var(--accent)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="t-caption mt-1">
            Dashed lines at RPE 7.5 (yellow) and 8.5 (red). Sustained high RPE signals accumulated fatigue.
          </p>
        </div>
      )}

      {!hasRPE && (
        <p className="t-caption" style={{ color: 'var(--text-lo)' }}>
          Start logging RPE on your sets to see average effort trends.
        </p>
      )}
    </div>
  )
}
