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

function CustomTick(props: any) {
  const { payload, x, y, cx, cy } = props

  // Determine label position relative to center
  const isLeft = x < cx
  const isRight = x > cx
  const isCenterVertical = Math.abs(x - cx) < 10

  // Calculate anchor and offset
  let anchor: "middle" | "start" | "end" = "middle"
  let dx = 0
  let dy = 0

  if (isCenterVertical) {
    anchor = 'middle'
    dy = y < cy ? -12 : 12 // Top or bottom labels
  } else if (isLeft) {
    anchor = 'end'
    dx = -15
  } else if (isRight) {
    anchor = 'start'
    dx = 15
  }

  return (
    <text
      x={x + dx}
      y={y + dy}
      fill="rgba(255,255,255,0.38)"
      fontSize={9}
      fontWeight={600}
      textAnchor={anchor}
      dominantBaseline="central"
    >
      {payload.value}
    </text>
  )
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
      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.07)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={<CustomTick />}
        />
        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#050505',
            border: '1px solid rgba(247,37,133,0.25)',
            borderRadius: 12,
            padding: '8px 12px',
          }}
          itemStyle={{ color: '#F72585', fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}
          labelStyle={{ color: 'rgba(255,255,255,0.38)', fontSize: 9 }}
          formatter={(value: any) => [`${Number(value)} sets`, '']}
        />
        <Radar
          name="Muscle Sets"
          dataKey="A"
          stroke="#F72585"
          strokeWidth={1.5}
          fill="#F72585"
          fillOpacity={0.12}
          style={{ filter: 'drop-shadow(0 0 6px rgba(247,37,133,0.55))' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
