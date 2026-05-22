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
  color = '#F72585',
  formatType = 'number',
}: ProgressionLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
          Not enough data yet.
        </p>
      </div>
    )
  }

  const colorKey = color.replace(/[^a-zA-Z0-9]/g, '')
  const gradId   = `lg-${colorKey}`

  const glowColor =
    color === '#F72585' ? 'rgba(247,37,133,0.75)'  :
    color === '#4CC9F0' ? 'rgba(76,201,240,0.75)'  :
    color === '#B5179E' ? 'rgba(181,23,158,0.75)'  :
    `${color}bb`

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
          stroke="rgba(255,255,255,0.04)"
          strokeDasharray="0"
          vertical={false}
        />

        <XAxis
          dataKey="date"
          tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          dy={8}
          interval="preserveStartEnd"
        />

        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => fmt(Number(v), formatType)}
          width={36}
        />

        <Tooltip
          contentStyle={{
            backgroundColor: '#050505',
            border: `1px solid ${color}44`,
            borderRadius: 12,
            padding: '8px 12px',
          }}
          itemStyle={{
            color,
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: 600,
          }}
          labelStyle={{ color: 'rgba(255,255,255,0.38)', fontSize: 9, marginBottom: 2 }}
          cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
          formatter={(value: any) => [fmt(Number(value), formatType), '']}
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
            stroke: '#000',
            strokeWidth: 2,
            style: { filter: `drop-shadow(0 0 6px ${glowColor})` },
          }}
          style={{ filter: `drop-shadow(0 0 3px ${glowColor})` }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
