'use client'

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface MuscleGroupData {
  subject: string
  A: number
  fullMark: number
}

export function WeeklyMuscleRadarChart({ data }: { data: MuscleGroupData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-zinc-500 text-sm font-bold">
        No data for the last 7 days.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="#27272a" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} />
        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }}
          itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
          formatter={(value: number) => [`${value} sets`, 'Volume']}
        />
        <Radar name="Muscle Sets" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
