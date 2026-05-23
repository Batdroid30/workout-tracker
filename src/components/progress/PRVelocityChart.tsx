'use client'

import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip,
} from 'recharts'

interface PRVelocityChartProps {
  velocityByMonth: { month: string; count: number }[]
}

interface ChartPoint {
  label: string
  count: number
  isLatest: boolean
}

function buildChartData(velocityByMonth: { month: string; count: number }[]): ChartPoint[] {
  // Last 12 months only
  const recent = velocityByMonth.slice(-12)
  const latestMonth = recent.at(-1)?.month ?? ''

  return recent.map(({ month, count }) => ({
    label:    new Date(month + '-01').toLocaleDateString([], { month: 'short' }),
    count,
    isLatest: month === latestMonth,
  }))
}

interface CustomTooltipProps {
  active?:  boolean
  payload?: { value: number }[]
  label?:   string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const count = payload[0].value
  return (
    <div
      className="text-xs px-2.5 py-1.5 rounded-lg"
      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-hi)' }}
    >
      <div style={{ color: 'var(--text-lo)' }}>{label}</div>
      <div className="font-semibold mt-0.5">{count} PR{count === 1 ? '' : 's'}</div>
    </div>
  )
}

export function PRVelocityChart({ velocityByMonth }: PRVelocityChartProps) {
  const data = buildChartData(velocityByMonth)

  if (data.length === 0) {
    return (
      <div className="h-[120px] flex items-center justify-center">
        <p className="t-caption">No PR data yet.</p>
      </div>
    )
  }

  return (
    <div className="h-[120px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: 'var(--text-lo)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: 'var(--text-lo)' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-2)', radius: 4 }} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={24}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.isLatest
                    ? 'color-mix(in srgb, var(--accent) 55%, transparent)'
                    : 'var(--accent)'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
