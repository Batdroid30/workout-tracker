'use client'

import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'

interface MuscleGroupData {
  subject: string
  A: number
  fullMark: number
}

export function WeeklyMuscleRadarChart({ data }: { data: MuscleGroupData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
          No data for the last 7 days.
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.07)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: 'rgba(255,255,255,0.38)', fontSize: 9, fontWeight: 600 }}
        />
        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#050505',
            border: '1px solid rgba(243,192,138,0.25)',
            borderRadius: 12,
            padding: '8px 12px',
          }}
          itemStyle={{ color: '#f3c08a', fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}
          labelStyle={{ color: 'rgba(255,255,255,0.38)', fontSize: 9 }}
          formatter={(value: any) => [`${Number(value)} sets`, '']}
        />
        <Radar
          name="Muscle Sets"
          dataKey="A"
          stroke="#f3c08a"
          strokeWidth={1.5}
          fill="#f3c08a"
          fillOpacity={0.12}
          style={{ filter: 'drop-shadow(0 0 6px rgba(243,192,138,0.55))' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
