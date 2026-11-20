import { requireAuth } from '@/lib/auth'
import { getExerciseProgression } from '@/lib/data/stats'
import { getProfile } from '@/lib/data/profile'
import { getExerciseById } from '@/lib/data/exercises'
import { notFound, redirect } from 'next/navigation'
import { Trophy, TrendingUp, AlertTriangle, Info } from 'lucide-react'
import { ProgressionLineChart } from '@/components/ui/ProgressionLineChart'
import { BackButton } from '@/components/ui/BackButton'
import { ExerciseMetaEditor } from '@/components/exercises/ExerciseMetaEditor'
import { deriveExerciseInsights } from '@/lib/algorithms'
import { TutorialVideo } from '@/components/exercises/TutorialVideo'
import type { MuscleGroup, MovementPattern, ExperienceLevel } from '@/types/database'
import { isAssisted } from '@/lib/load'

export default async function ExerciseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId, session } = await requireAuth()

  const [exercise, { prs, progression }, profile] = await Promise.all([
    getExerciseById(id),
    getExerciseProgression(userId, id),
    getProfile(userId),
  ])

  if (!exercise) notFound()

  const current1RM           = progression.length > 0 ? progression[progression.length - 1].best1RM : null
  const best1RMFromHistory   = progression.length > 0 ? Math.max(...progression.map(p => p.best1RM))   : null
  const assisted             = isAssisted(exercise.name)
  // For assisted lifts the best is the least assistance
  const pickBest             = assisted ? Math.min : Math.max
  const maxWeightFromHistory = progression.length > 0 ? pickBest(...progression.map(p => p.maxWeight)) : null

  const bestWeight = prs.find(p => p.pr_type === 'best_weight')?.value ?? maxWeightFromHistory
  const best1RM    = prs.find(p => p.pr_type === 'best_1rm')?.value    ?? best1RMFromHistory

  const display = (v: number | null | undefined) => v != null ? Math.round(Number(v)) : '—'

  const chartData1RM    = progression.map(p => ({ date: p.date, value: p.best1RM }))
  const chartDataWeight = progression.map(p => ({ date: p.date, value: p.maxWeight }))
  const chartDataVolume = progression.map(p => ({ date: p.date, value: Math.round(p.volume) }))

  const insights = deriveExerciseInsights(
    progression,
    (profile?.experience_level as ExperienceLevel | null) ?? null,
  )

  return (
    <div className="min-h-screen pb-24 text-primary">

      {/* ── Top Nav ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3 bg-bg border-b border-border">
        <BackButton />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold leading-tight truncate text-primary">
            {exercise.name}
          </h1>
          <div className="flex items-center gap-1 mt-0.5">
            <p className="t-label capitalize">
              {exercise.muscle_group}
              {exercise.secondary_muscles && exercise.secondary_muscles.length > 0
                ? ` · ${exercise.secondary_muscles.join(', ')}`
                : ''}
              {' · '}{exercise.movement_pattern}
            </p>
            <ExerciseMetaEditor
              exerciseId={exercise.id}
              currentMuscleGroup={exercise.muscle_group as MuscleGroup}
              currentMovementPattern={exercise.movement_pattern as MovementPattern}
              currentSecondaryMuscles={(exercise.secondary_muscles ?? []) as MuscleGroup[]}
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 mt-2 stagger-children">

        {/* ── Tutorial video ───────────────────────────────────────────── */}
        {!exercise.is_custom && exercise.youtube_video_id && (
          <TutorialVideo videoId={exercise.youtube_video_id} />
        )}

        {/* ── PRs ──────────────────────────────────────────────────────── */}
        <section className="fade-up">
          <h2 className="t-label mb-3">Personal records</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 text-center">
              <Trophy className="w-4 h-4 mx-auto mb-2 text-tertiary" />
              <p className="t-label">Current e1RM</p>
              <p className="mono text-xl mt-1 tracking-tight text-primary">
                {display(current1RM)} <span className="text-xs text-tertiary">kg</span>
              </p>
            </div>
            <div className="card border-border-strong p-4 text-center">
              <Trophy className="w-4 h-4 mx-auto mb-2 text-primary" />
              <p className="t-label text-primary">Best e1RM</p>
              <p className="mono text-xl mt-1 tracking-tight text-primary">
                {display(best1RM)} <span className="text-xs text-tertiary">kg</span>
              </p>
            </div>
            <div className="card p-4 text-center">
              <Trophy className="w-4 h-4 mx-auto mb-2 text-tertiary" />
              <p className="t-label">{assisted ? 'Least assistance' : 'Max weight'}</p>
              <p className="mono text-xl mt-1 tracking-tight text-primary">
                {display(bestWeight)} <span className="text-xs text-tertiary">kg</span>
              </p>
            </div>
            <div className="card p-4 text-center">
              <Trophy className="w-4 h-4 mx-auto mb-2 text-tertiary" />
              <p className="t-label">Sessions</p>
              <p className="mono text-xl mt-1 tracking-tight text-primary">
                {progression.length}
              </p>
            </div>
          </div>
        </section>

        {/* ── e1RM Progression chart ────────────────────────────────────── */}
        {chartData1RM.length > 1 && (
          <section className="fade-up">
            <h2 className="t-label mb-3">Est. 1RM progression</h2>
            <div className="card p-4">
              <div className="h-[180px] w-full">
                <ProgressionLineChart data={chartData1RM} formatType="number" />
              </div>
            </div>
          </section>
        )}

        {/* ── Max Weight Progression chart ─────────────────────────────── */}
        {chartDataWeight.length > 1 && (
          <section className="fade-up">
            <h2 className="t-label mb-3">{assisted ? 'Assistance progression' : 'Max weight progression'}</h2>
            <div className="card p-4">
              <div className="h-[180px] w-full">
                <ProgressionLineChart data={chartDataWeight} color="var(--data-2)" formatType="number" />
              </div>
            </div>
          </section>
        )}

        {/* ── Session volume chart ──────────────────────────────────── */}
        {chartDataVolume.length > 1 && (
          <section className="fade-up">
            <h2 className="t-label mb-3">Session volume</h2>
            <div className="card p-4">
              <div className="h-[180px] w-full">
                <ProgressionLineChart data={chartDataVolume} color="var(--data-3)" formatType="volume" />
              </div>
            </div>
          </section>
        )}

        {progression.length <= 1 && (
          <div
            className="card border-dashed p-8 text-center"
          >
            <p className="t-caption">
              Log this exercise at least twice to see progression charts.
            </p>
          </div>
        )}

        {/* ── Coach insights ────────────────────────────────────────── */}
        {insights.length > 0 && (
          <section className="fade-up">
            <h2 className="t-label mb-3">Coach insights</h2>
            <div className="space-y-2">
              {insights.map((insight, i) => (
                <div key={i} className="card p-4 flex items-start gap-3">
                  {insight.type === 'positive' && (
                    <TrendingUp className="w-4 h-4 mt-0.5 shrink-0 text-positive" />
                  )}
                  {insight.type === 'warning' && (
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-caution" />
                  )}
                  {insight.type === 'info' && (
                    <Info className="w-4 h-4 mt-0.5 shrink-0 text-secondary" />
                  )}
                  <p className="text-sm leading-relaxed text-secondary">
                    {insight.message}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
