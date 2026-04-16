import { ChartMockup } from '@/components/ui/ChartMockup'

export default function ProgressPage() {
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
              <option>Last 30 Days</option>
              <option>Last 6 Months</option>
            </select>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total Volume</p>
                <p className="text-4xl font-bold font-mono text-white tracking-tighter">48,240 <span className="text-base text-zinc-600">kg</span></p>
              </div>
              <div className="text-green-500 text-sm font-bold font-mono bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-md">
                +12%
              </div>
            </div>
            
            <div className="h-[200px] w-full">
               <ChartMockup type="volume" />
            </div>
          </div>
        </section>

        {/* 1RM Tracker */}
        <section>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-bold font-sans text-zinc-300">Est. 1RM Tracking</h2>
             <select className="bg-zinc-900 border border-zinc-800 text-[10px] tracking-wider uppercase font-bold text-brand px-3 py-2 rounded-lg focus:outline-none max-w-[140px] truncate">
              <option>Bench Press</option>
              <option>Deadlift</option>
              <option>Squat</option>
            </select>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
             <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Current 1RM</p>
                <p className="text-4xl font-bold font-mono text-brand tracking-tighter">105 <span className="text-base text-brand/50">kg</span></p>
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
