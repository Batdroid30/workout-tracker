import { ChartMockup } from '@/components/ui/ChartMockup'
import { auth } from '@/lib/auth'
import { getWorkoutsSummary, getVolumeHistory } from '@/lib/data/workouts'
import { redirect } from 'next/navigation'

export default async function ProgressPage() {
  const session = await auth()
  const userId = session?.user?.id as string
  const { totalVolume } = await getWorkoutsSummary(userId)
  const volumeHistory = await getVolumeHistory(userId)

  // Map volumeHistory to the format expected by ChartMockup
  const chartData = volumeHistory.map(item => ({
    date: new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: item.volume
  }))

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      {/* Header */}
      <h1 className="text-3xl font-bold font-sans mt-4 mb-8">Progress</h1>

      <div className="space-y-8">
        {/* Volume Tracker */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-sans text-zinc-300">Volume Analysis</h2>
            <select className="bg-zinc-900 border border-zinc-800 text-[10px] uppercase font-bold text-zinc-400 px-3 py-2 rounded-lg focus:outline-none">
              <option>Total Volume</option>
            </select>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total Volume</p>
                <p className="text-4xl font-bold font-mono text-white tracking-tighter">
                  {totalVolume.toLocaleString()} <span className="text-base text-zinc-600">kg</span>
                </p>
              </div>
              {chartData.length > 1 && (
                <div className="text-green-500 text-sm font-bold font-mono bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-md">
                  Real Data
                </div>
              )}
            </div>
            
            <div className="h-[200px] w-full">
               <ChartMockup type="volume" data={chartData} />
            </div>
          </div>
        </section>

        {/* 1RM Tracker */}
        <section>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-bold font-sans text-zinc-300">Est. 1RM Tracking</h2>
             <select className="bg-zinc-900 border border-zinc-800 text-[10px] tracking-wider uppercase font-bold text-brand px-3 py-2 rounded-lg focus:outline-none max-w-[140px] truncate">
              <option>Dropdown Placeholder</option>
            </select>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
             <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Current 1RM</p>
                <p className="text-4xl font-bold font-mono text-brand tracking-tighter">— <span className="text-base text-brand/50">kg</span></p>
              </div>
            </div>
            
            <div className="h-[200px] w-full">
               <ChartMockup type="1rm" />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
