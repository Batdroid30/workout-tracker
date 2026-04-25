import { ProgressionLineChart } from '@/components/ui/ProgressionLineChart'
import { WeeklyMuscleRadarChart } from '@/components/ui/WeeklyMuscleRadarChart'
import { auth } from '@/lib/auth'
import { getWorkoutsSummary, getVolumeHistory } from '@/lib/data/workouts'
import { getWeeklyMuscleGroupStats } from '@/lib/data/stats'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, Dumbbell, Activity } from 'lucide-react'

export default async function ProgressPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id
  const { totalVolume } = await getWorkoutsSummary(userId)
  const volumeHistory   = await getVolumeHistory(userId)
  const radarData       = await getWeeklyMuscleGroupStats(userId)

  const chartData = volumeHistory.map(item => ({
    date:  new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: item.volume,
  }))

  return (
    <div className="min-h-screen bg-[#070d1f] text-[#dce1fb] pb-24">
      {/* Page hero — open section, not a sticky nav */}
      <div className="px-4 pt-8 pb-6">
        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#4a5568] mb-1">Your Data</p>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">Progress</h1>
      </div>

      <div className="px-4 space-y-6">

        {/* ── Volume stat strip ───────────────────────────── */}
        <div className="glass-panel border border-[#CCFF00]/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#4a5568] mb-1">Total Volume Lifted</p>
            <p className="text-4xl font-black text-[#CCFF00] tracking-tighter">
              {totalVolume >= 1_000_000
                ? `${(totalVolume / 1_000_000).toFixed(2)}M`
                : totalVolume >= 1_000
                ? `${(totalVolume / 1_000).toFixed(1)}k`
                : totalVolume}
              <span className="text-base text-[#CCFF00]/40 ml-1">kg</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-[#CCFF00]/10 border border-[#CCFF00]/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[#CCFF00]" />
          </div>
        </div>

        {/* ── Volume over time ────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb4ce]">Volume Over Time</h2>
          </div>
          <div className="glass-panel border border-[#334155] rounded-xl p-4">
            {chartData.length > 1 ? (
              <div className="h-[200px] w-full">
                <ProgressionLineChart
                  data={chartData}
                  color="#CCFF00"
                  formatType="volume"
                />
              </div>
            ) : (
              <div className="h-[120px] flex items-center justify-center">
                <p className="text-[11px] text-[#334155] font-body tracking-wide">
                  Log a few workouts to see your volume trend.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Muscle focus radar ──────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb4ce]">Muscle Focus</h2>
            <span className="text-[9px] font-black uppercase tracking-widest text-[#CCFF00] bg-[#CCFF00]/10 border border-[#CCFF00]/20 px-2.5 py-1 rounded-lg">
              Last 7 Days
            </span>
          </div>
          <div className="glass-panel border border-[#334155] rounded-xl p-4 flex flex-col items-center">
            <div className="h-[240px] w-full">
              <WeeklyMuscleRadarChart data={radarData} />
            </div>
            <p className="text-[11px] text-[#4a5568] font-body mt-2 text-center tracking-wide">
              Distribution of working sets across muscle groups this week.
            </p>
          </div>
        </section>

        {/* ── Drill into exercises ────────────────────────── */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb4ce] mb-3">Exercise Detail</h2>
          <div className="glass-panel border border-[#334155] rounded-xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 bg-[#151b2d] border border-[#334155] rounded-xl flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-[#CCFF00]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-white uppercase tracking-tight">Per-Exercise Stats</p>
              <p className="text-[11px] text-[#4a5568] font-body mt-0.5 tracking-wide">
                View e1RM progression, max weight and PRs for any exercise.
              </p>
            </div>
            <Link
              href="/exercises"
              className="shrink-0 h-9 px-4 bg-[#CCFF00] text-[#020617] font-black text-[10px] uppercase tracking-widest rounded-lg flex items-center hover:bg-[#abd600] active:scale-95 transition-all"
            >
              Browse
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
