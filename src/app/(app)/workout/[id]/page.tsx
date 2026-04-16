import { ArrowLeft, Clock, Dumbbell, Trophy } from 'lucide-react'
import Link from 'next/link'

export default function WorkoutHistoryDetail({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Top Nav */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-zinc-900 p-4 flex items-center gap-3">
        <Link href="/dashboard" className="p-2 -ml-2 rounded-full hover:bg-zinc-900 transition-colors">
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <h1 className="text-xl font-bold font-sans">Summary</h1>
      </div>

      <div className="p-4 space-y-6 mt-2">
        {/* Header summary */}
        <div>
          <h2 className="text-3xl font-bold font-sans">Pull Day</h2>
          <p className="text-zinc-500 font-mono mt-1 text-sm tracking-wide">Thursday, April 16 at 6:00 AM</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center gap-3">
            <div className="bg-brand/10 p-2.5 rounded-lg border border-brand/20">
              <Clock className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Duration</p>
              <p className="text-lg font-bold font-mono mt-0.5">1h 12m</p>
            </div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center gap-3">
            <div className="bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20">
              <Dumbbell className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Volume</p>
              <p className="text-lg font-bold font-mono mt-0.5">3240 kg</p>
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2 mt-8">Exercises Log</h3>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-800/30">
              <span className="font-bold text-white text-lg font-sans tracking-tight">Deadlift</span>
            </div>
            
            <div className="w-full">
              <div className="flex text-xs font-bold text-zinc-500 uppercase tracking-wider py-3 px-4 bg-zinc-900 border-b border-zinc-800">
                <div className="w-8">Set</div>
                <div className="flex-1 text-center">kg</div>
                <div className="flex-1 text-center">Reps</div>
                <div className="w-8 opacity-0">...</div>
              </div>
              
              <div className="flex text-sm py-4 px-4 items-center font-mono border-b border-zinc-800">
                <div className="w-8 font-bold text-zinc-500 bg-zinc-800 w-6 h-6 flex items-center justify-center rounded-md">1</div>
                <div className="flex-1 text-center text-white font-bold">100</div>
                <div className="flex-1 text-center text-white font-bold">5</div>
                <div className="w-8 text-right"></div>
              </div>

              <div className="flex text-sm py-4 px-4 items-center font-mono bg-yellow-500/5">
                <div className="w-8 font-bold text-yellow-600 bg-yellow-500/10 w-6 h-6 flex items-center justify-center rounded-md">2</div>
                <div className="flex-1 text-center text-yellow-500 font-bold text-lg">120</div>
                <div className="flex-1 text-center text-yellow-500 font-bold text-lg">3</div>
                <div className="w-8 flex justify-end"><Trophy className="w-4 h-4 text-yellow-500 animate-pulse" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
