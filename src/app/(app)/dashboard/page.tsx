import { Dumbbell, Plus } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pt-4">
        <div>
          <h1 className="text-3xl font-bold font-sans">Home</h1>
          <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase mt-1">This Week</p>
        </div>
        <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
          <span className="font-bold text-sm text-zinc-300">SM</span>
        </div>
      </div>

      {/* Quick Summary Mock */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase mb-1">Workouts</p>
          <p className="text-4xl font-bold font-mono text-white">4</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 relative overflow-hidden">
          <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase mb-1">Volume</p>
          <p className="text-4xl font-bold font-mono text-brand z-10 relative">12k <span className="text-base text-brand/50">kg</span></p>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Dumbbell className="w-20 h-20 text-brand" />
          </div>
        </div>
      </div>

      {/* Recent Workouts */}
      <div>
        <h2 className="text-lg font-bold mb-4 font-sans text-zinc-300">Recent Activity</h2>
        
        <div className="space-y-4">
          {/* Mock Workout Card */}
          <Link href="/workout/test-id-123" className="block">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 active:scale-[0.98] transition-all hover:bg-zinc-800/80 cursor-pointer text-left">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-white font-sans">Pull Day</h3>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">Today at 6:00 AM</p>
                </div>
                <div className="bg-brand/10 text-brand px-2 py-1 flex items-center justify-center rounded-lg text-xs font-bold font-mono border border-brand/20">
                  1h 12m
                </div>
              </div>
              
              <div className="flex gap-4 text-sm font-mono text-zinc-400 mb-4">
                <span className="text-white font-bold tracking-wide">3,240 kg</span>
                <span className="flex items-center text-yellow-500"><span className="mr-1">🔥</span> 2 PRs</span>
              </div>
              
              <div className="pt-3 border-t border-zinc-800/60 text-sm font-mono text-zinc-500 truncate leading-relaxed">
                Deadlift, Pull-ups, Barbell Row, Lat Pulldown
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30">
        <Link href="/workout">
          <button className="bg-brand text-white font-bold font-sans text-lg px-8 py-4 rounded-xl shadow-[0_8px_30px_rgb(37,99,235,0.4)] flex items-center gap-2 hover:bg-brand-hover active:scale-95 transition-all w-max whitespace-nowrap">
            <Plus className="w-6 h-6" /> Start Workout
          </button>
        </Link>
      </div>
    </div>
  )
}
