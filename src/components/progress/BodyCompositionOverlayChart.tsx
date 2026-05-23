'use client'

import {
  ComposedChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
  ReferenceLine, Legend,
} from 'recharts'

// Aligned weekly data built server-side
export interface OverlayPoint {
  label:     string    // formatted week label
  weekStart: string    // YYYY-MM-DD for alignment
  weight:    number | null   // avg bodyweight for that week (kg delta from start)
  strength:  number | null   // strength index % change from baseline
}

interface BodyCompositionOverlayChartProps {
  data: OverlayPoint[]
}

interface CustomTooltipProps {
  active?:  boolean
  payload?: { name: string; value: number | null; color: string }[]
  label?:   string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="text-xs px-2.5 py-1.5 rounded-lg space-y-0.5"
      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-hi)' }}
    >
      <div className="font-medium mb-1" style={{ color: 'var(--text-lo)' }}>{label}</div>
      {payload.map(p => p.value !== null && (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="font-semibold ml-auto pl-3">
            {p.value >= 0 ? '+' : ''}{p.value.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}

export function BodyCompositionOverlayChart({ data }: BodyCompositionOverlayChartProps) {
  const validData = data.filter(d => d.weight !== null || d.strength !== null)

  if (validData.length < 3) {
    return (
      <div className="h-[160px] flex items-center justify-center">
        <p className="t-caption text-center">
          Log bodyweight readings over several weeks to see the weight + strength overlay.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
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
              tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="weight"
              name="Weight"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              activeDot={{ r: 3, fill: '#60a5fa' }}
            />
            <Line
              type="monotone"
              dataKey="strength"
              name="Strength"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              activeDot={{ r: 3, fill: 'var(--accent)' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full" style={{ background: '#60a5fa' }} />
          <span className="t-caption">Bodyweight Δ%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />
          <span className="t-caption">Strength Index Δ%</span>
        </div>
      </div>
      <p className="t-caption text-center mt-1">
        Strength rising while weight is stable = muscle gain without fat.
      </p>
    </>
  )
}
