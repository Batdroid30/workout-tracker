'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface ChartData {
  date: string
  value: number
}

interface ProgressionLineChartProps {
  data:        ChartData[]
  color?:      string
  formatType?: 'volume' | 'number'
}

function fmt(value: number, formatType: string): string {
  if (formatType === 'volume') {
    return value >= 1000
      ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
      : String(value)
  }
  return typeof value === 'number' && !Number.isInteger(value)
    ? value.toFixed(1)
    : String(value)
}

export function ProgressionLineChart({
  data,
  color = 'var(--data-1)',
  formatType = 'number',
}: ProgressionLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="t-caption text-tertiary">
          Not enough data yet.
        </p>
      </div>
    )
  }

  const colorKey = color.replace(/[^a-zA-Z0-9]/g, '')
  const gradId   = `lg-${colorKey}`

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>

        <CartesianGrid
          stroke="var(--border)"
          strokeDasharray="0"
          vertical={false}
        />

        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          dy={8}
          interval="preserveStartEnd"
        />

        <YAxis
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => fmt(Number(v), formatType)}
          width={36}
        />

        <Tooltip
          contentStyle={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-strong)',
            borderRadius: 12,
            padding: '8px 12px',
          }}
          itemStyle={{
            color: 'var(--text-secondary)',
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: 600,
          }}
          labelStyle={{ color: 'var(--text-primary)', fontSize: 12, marginBottom: 2 }}
          cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
          formatter={(value) => [fmt(Number(value), formatType), '']}
        />

        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradId})`}
          dot={false}
          activeDot={{
            r: 4,
            fill: color,
            stroke: 'var(--bg)',
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
