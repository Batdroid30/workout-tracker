'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface ChartData {
  date: string
  value: number
}

const volumeMockData = [
  { date: 'Mon', value: 8000 },
  { date: 'Wed', value: 12000 },
  { date: 'Fri', value: 9500 },
  { date: 'Sun', value: 14000 },
  { date: 'Tue', value: 13500 },
]

const e1rmMockData = [
  { date: 'Week 1', value: 90 },
  { date: 'Week 2', value: 95 },
  { date: 'Week 3', value: 95 },
  { date: 'Week 4', value: 100 },
  { date: 'Week 5', value: 105 },
]

export function ChartMockup({ type, data }: { type: 'volume' | '1rm', data?: ChartData[] }) {
  const chartData = data && data.length > 0 ? data : (type === 'volume' ? volumeMockData : e1rmMockData)
  const color = type === 'volume' ? '#ffffff' : '#2563eb' // White vs Brand Blue

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
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
          tickFormatter={(value) => type === 'volume' ? (value >= 1000 ? `${value/1000}k` : `${value}`) : `${value}`}
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
