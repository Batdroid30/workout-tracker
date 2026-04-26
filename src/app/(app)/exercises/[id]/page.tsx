import { getSupabaseServer } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { getExerciseProgression } from '@/lib/data/stats'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy } from 'lucide-react'
import { ProgressionLineChart } from '@/components/ui/ProgressionLineChart'
import { ExerciseMetaEditor } from '@/components/exercises/ExerciseMetaEditor'

export default async function ExerciseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId = session?.user?.id as string

  const supabase = await getSupabaseServer()
  const { data: exercise } = await supabase.from('exercises').select('*').eq('id', id).single()

  if (!exercise) notFound()

  const { prs, progression } = await getExerciseProgression(userId, id)

  const current1RM          = progression.length > 0 ? progression[progression.length - 1].best1RM : null
  const best1RMFromHistory  = progression.length > 0 ? Math.max(...progression.map(p => p.best1RM))   : null
  const maxWeightFromHistory = progression.length > 0 ? Math.max(...progression.map(p => p.maxWeight)) : null

  const bestWeight = prs.find(p => p.pr_type === 'best_weight')?.value ?? maxWeightFromHistory
  const best1RM    = prs.find(p => p.pr_type === 'best_1rm')?.value    ?? best1RMFromHistory

  const display = (v: number | null | undefined) =>
    v ? Math.round(Number(v)) : '—'

  const chartData1RM    = progression.map(p => ({ date: p.date, value: p.best1RM }))
  const chartDataWeight = progression.map(p => ({ date: p.date, value: p.maxWeight }))

  return (
    <div className="min-h-screen bg-[#070d1f] text-[#dce1fb] pb-24">
      {/* Top Nav */}
      <div className="sticky top-0 z-30 bg-[#070d1f]/95 backdrop-blur border-b border-[#334155] px-4 py-3 flex items-center gap-3">
        <Link href="/exercises" className="p-2.5 hover:bg-[#151b2d] rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-[#adb4ce]" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-black uppercase tracking-widest text-white leading-tight truncate">{exercise.name}</h1>
          <div className="flex items-center gap-1 mt-0.5">
            <p className="text-[10px] text-[#4a5568] font-black uppercase tracking-widest">
              {exercise.muscle_group} · {exercise.movement_pattern}
            </p>
            <ExerciseMetaEditor
              exerciseId={exercise.id}
              currentMuscleGroup={exercise.muscle_group}
              currentMovementPattern={exercise.movement_pattern}
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 mt-2">
        {/* PRs */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#adb4ce] mb-3">
            Personal Records
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel border border-[#334155] rounded-xl p-4 text-center">
              <Trophy className="w-4 h-4 text-[#4a5568] mx-auto mb-2" />
              <p className="text-[9px] text-[#4a5568] font-black uppercase tracking-widest">Current e1RM</p>
              <p className="text-xl font-black text-white mt-1 tracking-tight">
                {display(current1RM)} <span className="text-xs text-[#334155]">kg</span>
              </p>
            </div>
            <div className="glass-panel border border-[#CCFF00]/30 rounded-xl p-4 text-center">
              <Trophy className="w-4 h-4 text-[#CCFF00] mx-auto mb-2" />
              <p className="text-[9px] text-[#CCFF00] font-black uppercase tracking-widest">Best e1RM</p>
              <p className="text-xl font-black text-[#CCFF00] mt-1 tracking-tight">
                {display(best1RM)} <span className="text-xs text-[#CCFF00]/40">kg</span>
              </p>
            </div>
            <div className="glass-panel border border-[#334155] rounded-xl p-4 text-center">
              <Trophy className="w-4 h-4 text-[#4a5568] mx-auto mb-2" />
              <p className="text-[9px] text-[#4a5568] font-black uppercase tracking-widest">Max Weight</p>
              <p className="text-xl font-black text-white mt-1 tracking-tight">
                {display(bestWeight)} <span className="text-xs text-[#334155]">kg</span>
              </p>
            </div>
            <div className="glass-panel border border-[#334155] rounded-xl p-4 text-center">
              <Trophy className="w-4 h-4 text-[#4a5568] mx-auto mb-2" />
              <p className="text-[9px] text-[#4a5568] font-black uppercase tracking-widest">Sessions</p>
              <p className="text-xl font-black text-white mt-1 tracking-tight">
                {progression.length}
              </p>
            </div>
          </div>
        </section>

        {/* Progression: e1RM */}
        {chartData1RM.length > 1 && (
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#adb4ce] mb-3">
              Est. 1RM Progression
            </h2>
            <div className="glass-panel border border-[#334155] rounded-xl p-4">
              <div className="h-[180px] w-full">
                <ProgressionLineChart data={chartData1RM} color="#CCFF00" formatType="number" />
              </div>
            </div>
          </section>
        )}

        {/* Progression: Max Weight */}
        {chartDataWeight.length > 1 && (
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#adb4ce] mb-3">
              Max Weight Progression
            </h2>
            <div className="glass-panel border border-[#334155] rounded-xl p-4">
              <div className="h-[180px] w-full">
                <ProgressionLineChart data={chartDataWeight} color="#adb4ce" formatType="number" />
              </div>
            </div>
          </section>
        )}

        {progression.length <= 1 && (
          <div className="glass-panel border border-dashed border-[#334155] rounded-xl p-8 text-center">
            <p className="text-[#4a5568] text-sm font-body">
              Log this exercise at least twice to see progression charts.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
