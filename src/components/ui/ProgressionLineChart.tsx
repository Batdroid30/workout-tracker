'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface ChartData {
  date: string
  value: number
}

interface ProgressionLineChartProps {
  data: ChartData[]
  color?: string
  formatType?: 'volume' | 'number'
}

export function ProgressionLineChart({ data, color = '#3b82f6', formatType = 'number' }: ProgressionLineChartProps) {
  const formatValue = (value: number) => {
    if (formatType === 'volume') {
      return value >= 1000 ? `${(value/1000).toFixed(1).replace(/\.0$/, '')}k` : `${value}`
    }
    return `${value}`
  }
  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-zinc-500 text-sm font-bold">
        Not enough data to generate graph.
      </div>
    )
  }

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
          tickFormatter={formatValue}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }}
          itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
          cursor={{ stroke: '#3f3f46' }}
          formatter={(value: number) => [formatValue(value), 'Value']}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={4} 
          dot={{ fill: '#000', stroke: color, strokeWidth: 3, r: 4 }} 
          activeDot={{ r: 6, fill: color, stroke: '#000', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
