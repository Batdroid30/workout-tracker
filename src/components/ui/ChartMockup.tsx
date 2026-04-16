'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const volumeData = [
  { date: 'Mon', value: 8000 },
  { date: 'Wed', value: 12000 },
  { date: 'Fri', value: 9500 },
  { date: 'Sun', value: 14000 },
  { date: 'Tue', value: 13500 },
]

const e1rmData = [
  { date: 'Week 1', value: 90 },
  { date: 'Week 2', value: 95 },
  { date: 'Week 3', value: 95 },
  { date: 'Week 4', value: 100 },
  { date: 'Week 5', value: 105 },
]

export function ChartMockup({ type }: { type: 'volume' | '1rm' }) {
  const data = type === 'volume' ? volumeData : e1rmData
  const color = type === 'volume' ? '#ffffff' : '#2563eb' // White vs Brand Blue

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis 
          dataKey="date" 
          stroke="#71717a" 
          fontSize={10} 
          tickLine={false}
          axisLine={false}
          dy={10}
        />
        <YAxis 
          stroke="#71717a" 
          fontSize={10} 
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => type === 'volume' ? `${value/1000}k` : `${value}`}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }}
          itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
          cursor={{ stroke: '#3f3f46' }}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={4} 
          dot={{ fill: '#000', stroke: color, strokeWidth: 3, r: 5 }} 
          activeDot={{ r: 7, fill: color, stroke: '#000', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
