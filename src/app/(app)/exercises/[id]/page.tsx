import { getSupabaseServer } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { getExerciseProgression } from '@/lib/data/stats'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy } from 'lucide-react'
import { ProgressionLineChart } from '@/components/ui/ProgressionLineChart'

export default async function ExerciseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId = session?.user?.id as string

  const supabase = await getSupabaseServer()
  const { data: exercise } = await supabase.from('exercises').select('*').eq('id', id).single()

  if (!exercise) notFound()

  const { prs, progression } = await getExerciseProgression(userId, id)

  const bestWeight = prs.find(p => p.pr_type === 'best_weight')
  const best1RM = prs.find(p => p.pr_type === 'best_1rm')
  const bestVolume = prs.find(p => p.pr_type === 'best_volume')

  const chartData1RM = progression.map(p => ({ date: p.date, value: p.best1RM }))
  const chartDataWeight = progression.map(p => ({ date: p.date, value: p.maxWeight }))

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Top Nav */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-zinc-900 p-4 flex items-center gap-3">
        <Link href="/exercises" className="p-2 -ml-2 rounded-full hover:bg-zinc-900 transition-colors">
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-sans tracking-tight">{exercise.name}</h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{exercise.muscle_group}</p>
        </div>
      </div>

      <div className="p-4 space-y-8 mt-4">
        {/* PRs Section */}
        <section>
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Personal Records</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Max Weight</p>
              <p className="text-xl font-bold font-mono text-white mt-1">
                {bestWeight ? bestWeight.value : '—'} <span className="text-xs text-zinc-500">kg</span>
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <Trophy className="w-6 h-6 text-brand mx-auto mb-2" />
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Est. 1RM</p>
              <p className="text-xl font-bold font-mono text-brand mt-1">
                {best1RM ? best1RM.value : '—'} <span className="text-xs text-brand/50">kg</span>
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <Trophy className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Max Vol</p>
              <p className="text-xl font-bold font-mono text-purple-500 mt-1 truncate">
                {bestVolume ? bestVolume.value : '—'} <span className="text-xs text-purple-500/50">kg</span>
              </p>
            </div>
          </div>
        </section>

        {/* Progression Charts */}
        <section>
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Progression (Estimated 1RM)</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="h-[200px] w-full">
              <ProgressionLineChart data={chartData1RM} color="#3b82f6" />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Progression (Max Weight)</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="h-[200px] w-full">
              <ProgressionLineChart data={chartDataWeight} color="#ffffff" />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
