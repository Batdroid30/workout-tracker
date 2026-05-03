import { getSupabaseServer } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { getExerciseProgression } from '@/lib/data/stats'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy } from 'lucide-react'
import { ProgressionLineChart } from '@/components/ui/ProgressionLineChart'
import { ExerciseMetaEditor } from '@/components/exercises/ExerciseMetaEditor'
import type { MuscleGroup, MovementPattern } from '@/types/database'

export default async function ExerciseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId  = session?.user?.id as string

  const supabase = await getSupabaseServer()
  const { data: exercise } = await supabase.from('exercises').select('*').eq('id', id).single()

  if (!exercise) notFound()

  const { prs, progression } = await getExerciseProgression(userId, id)

  const current1RM           = progression.length > 0 ? progression[progression.length - 1].best1RM : null
  const best1RMFromHistory   = progression.length > 0 ? Math.max(...progression.map(p => p.best1RM))   : null
  const maxWeightFromHistory = progression.length > 0 ? Math.max(...progression.map(p => p.maxWeight)) : null

  const bestWeight = prs.find(p => p.pr_type === 'best_weight')?.value ?? maxWeightFromHistory
  const best1RM    = prs.find(p => p.pr_type === 'best_1rm')?.value    ?? best1RMFromHistory

  const display = (v: number | null | undefined) => v ? Math.round(Number(v)) : '—'

  const chartData1RM    = progression.map(p => ({ date: p.date, value: p.best1RM }))
  const chartDataWeight = progression.map(p => ({ date: p.date, value: p.maxWeight }))

  return (
    <div className="min-h-screen pb-24" style={{ color: 'var(--text-hi)' }}>

      {/* ── Top Nav ──────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{
          background: 'rgba(6,7,13,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <Link
          href="/exercises"
          className="p-2.5 rounded-[var(--radius-inner)] transition-colors hover:bg-white/[0.06]"
          style={{ color: 'var(--text-mid)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1
            className="text-sm font-semibold uppercase tracking-widest leading-tight truncate"
            style={{ color: 'var(--text-hi)' }}
          >
            {exercise.name}
          </h1>
          <div className="flex items-center gap-1 mt-0.5">
            <p className="t-label">
              {exercise.muscle_group} · {exercise.movement_pattern}
            </p>
            <ExerciseMetaEditor
              exerciseId={exercise.id}
              currentMuscleGroup={exercise.muscle_group as MuscleGroup}
              currentMovementPattern={exercise.movement_pattern as MovementPattern}
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 mt-2">

        {/* ── PRs ──────────────────────────────────────────────────────── */}
        <section>
          <h2 className="t-label mb-3">Personal Records</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass p-4 text-center">
              <Trophy className="w-4 h-4 mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
              <p className="t-label">Current e1RM</p>
              <p className="mono text-xl mt-1 tracking-tight" style={{ color: 'var(--text-hi)' }}>
                {display(current1RM)} <span className="text-xs" style={{ color: 'var(--text-faint)' }}>kg</span>
              </p>
            </div>
            <div
              className="glass p-4 text-center"
              style={{ borderColor: 'var(--accent-line)' }}
            >
              <Trophy className="w-4 h-4 mx-auto mb-2" style={{ color: 'var(--accent)' }} />
              <p className="t-label" style={{ color: 'var(--accent)' }}>Best e1RM</p>
              <p className="mono text-xl mt-1 tracking-tight" style={{ color: 'var(--accent)', textShadow: '0 0 16px var(--accent-glow)' }}>
                {display(best1RM)} <span className="text-xs" style={{ color: 'var(--accent-line)' }}>kg</span>
              </p>
            </div>
            <div className="glass p-4 text-center">
              <Trophy className="w-4 h-4 mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
              <p className="t-label">Max Weight</p>
              <p className="mono text-xl mt-1 tracking-tight" style={{ color: 'var(--text-hi)' }}>
                {display(bestWeight)} <span className="text-xs" style={{ color: 'var(--text-faint)' }}>kg</span>
              </p>
            </div>
            <div className="glass p-4 text-center">
              <Trophy className="w-4 h-4 mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
              <p className="t-label">Sessions</p>
              <p className="mono text-xl mt-1 tracking-tight" style={{ color: 'var(--text-hi)' }}>
                {progression.length}
              </p>
            </div>
          </div>
        </section>

        {/* ── e1RM Progression chart ────────────────────────────────────── */}
        {chartData1RM.length > 1 && (
          <section>
            <h2 className="t-label mb-3">Est. 1RM Progression</h2>
            <div className="glass p-4">
              <div className="h-[180px] w-full">
                <ProgressionLineChart data={chartData1RM} color="#f3c08a" formatType="number" />
              </div>
            </div>
          </section>
        )}

        {/* ── Max Weight Progression chart ─────────────────────────────── */}
        {chartDataWeight.length > 1 && (
          <section>
            <h2 className="t-label mb-3">Max Weight Progression</h2>
            <div className="glass p-4">
              <div className="h-[180px] w-full">
                <ProgressionLineChart data={chartDataWeight} color="#7fd9c8" formatType="number" />
              </div>
            </div>
          </section>
        )}

        {progression.length <= 1 && (
          <div
            className="glass p-8 text-center"
            style={{ borderStyle: 'dashed' }}
          >
            <p className="t-caption">
              Log this exercise at least twice to see progression charts.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
