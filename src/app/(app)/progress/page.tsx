import { ProgressionLineChart } from '@/components/ui/ProgressionLineChart'
import { WeeklyMuscleRadarChart } from '@/components/ui/WeeklyMuscleRadarChart'
import { auth } from '@/lib/auth'
import { getWorkoutsSummary, getVolumeHistory } from '@/lib/data/workouts'
import { getWeeklyMuscleGroupStats } from '@/lib/data/stats'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProgressPage() {
  const session = await auth()
  const userId = session?.user?.id as string
  const { totalVolume } = await getWorkoutsSummary(userId)
  const volumeHistory = await getVolumeHistory(userId)
  const radarData = await getWeeklyMuscleGroupStats(userId)

  // Map volumeHistory to the format expected by ProgressionLineChart
  const chartData = volumeHistory.map(item => ({
    date: new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: item.volume
  }))

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      {/* Header */}
      <h1 className="text-3xl font-bold font-sans mt-4 mb-8">Progress</h1>

      <div className="space-y-8">
        {/* Weekly Muscle Radar */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-sans text-zinc-300">Weekly Muscle Focus</h2>
            <span className="bg-brand/10 text-[10px] uppercase font-bold text-brand px-3 py-1.5 rounded-lg">
              Last 7 Days
            </span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center">
            <div className="h-[250px] w-full">
               <WeeklyMuscleRadarChart data={radarData} />
            </div>
            <p className="text-xs text-zinc-500 font-bold mt-2 text-center max-w-[250px]">
              Distribution of working sets across muscle groups.
            </p>
          </div>
        </section>

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
            </div>
            
            <div className="h-[200px] w-full">
               <ProgressionLineChart 
                 data={chartData} 
                 color="#ffffff" 
                 formatType="volume"
               />
            </div>
          </div>
        </section>

        {/* 1RM Tracker - We'll just guide them to Exercise Details since 1RM is per-exercise */}
        <section>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-bold font-sans text-zinc-300">Exercise Details</h2>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="font-bold mb-2">Track 1RM & PRs</h3>
            <p className="text-sm text-zinc-400 mb-6 max-w-xs mx-auto">
              You can now track Estimated 1RM, Max Weight, and Personal Records for every single exercise.
            </p>
            <Link 
              href="/exercises" 
              className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 font-bold text-black"
            >
              Browse Exercises
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
