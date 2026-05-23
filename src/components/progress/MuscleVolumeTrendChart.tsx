'use client'

import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend,
} from 'recharts'
import type { WeeklySnapshotData } from '@/lib/data/progress-snapshot'
import { PUSH_MUSCLES, PULL_MUSCLES, LEG_MUSCLES } from '@/lib/training-constants'

interface MuscleVolumeTrendChartProps {
  weeklyData: WeeklySnapshotData[]
}

interface ChartPoint {
  label: string
  push:  number
  pull:  number
  legs:  number
}

function buildChartData(weeklyData: WeeklySnapshotData[]): ChartPoint[] {
  // Last 8 weeks only — older data is less actionable
  return weeklyData.slice(-8).map(w => {
    let push = 0, pull = 0, legs = 0
    for (const [muscle, count] of Object.entries(w.setsByMuscle)) {
      if (PUSH_MUSCLES.has(muscle))      push += count
      else if (PULL_MUSCLES.has(muscle)) pull += count
      else if (LEG_MUSCLES.has(muscle))  legs += count
    }
    return {
      label: new Date(w.weekStart + 'T00:00:00Z')
        .toLocaleDateString([], { month: 'short', day: 'numeric' }),
      push, pull, legs,
    }
  })
}

interface CustomTooltipProps {
  active?:  boolean
  payload?: { name: string; value: number; fill: string }[]
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
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm" style={{ background: p.fill }} />
          <span className="capitalize">{p.name}</span>
          <span className="font-semibold ml-auto pl-4">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function MuscleVolumeTrendChart({ weeklyData }: MuscleVolumeTrendChartProps) {
  const data = buildChartData(weeklyData)

  if (data.length < 2) {
    return (
      <div className="h-[160px] flex items-center justify-center">
        <p className="t-caption">Log more workouts to see your volume trend by category.</p>
      </div>
    )
  }

  return (
    <div className="h-[160px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: 'var(--text-lo)' }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(data.length / 4)}
          />
          <YAxis
            tick={{ fontSize: 9, fill: 'var(--text-lo)' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-2)', radius: 4 }} />
          <Bar
            dataKey="push"
            name="Push"
            stackId="a"
            fill="color-mix(in srgb, var(--accent) 85%, #60a5fa)"
            radius={[0, 0, 0, 0]}
            maxBarSize={20}
          />
          <Bar
            dataKey="pull"
            name="Pull"
            stackId="a"
            fill="var(--accent)"
            radius={[0, 0, 0, 0]}
            maxBarSize={20}
          />
          <Bar
            dataKey="legs"
            name="Legs"
            stackId="a"
            fill="color-mix(in srgb, var(--accent) 60%, #a78bfa)"
            radius={[3, 3, 0, 0]}
            maxBarSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
