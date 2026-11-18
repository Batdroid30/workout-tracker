'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Clock, Dumbbell, Repeat, Layers, Check, Sparkles } from 'lucide-react'
import type { ActiveWorkout } from '@/types/database'
import type { PREvaluationResult } from '@/lib/data/stats'

interface PostWorkoutSummaryProps {
  workout: ActiveWorkout
  prs:     PREvaluationResult[]
  onDone:  () => void
}

function formatDuration(ms: number): string {
  const totalMin = Math.max(1, Math.round(ms / 60000))
  if (totalMin < 60) return `${totalMin} min`
  const hours = Math.floor(totalMin / 60)
  const mins  = totalMin % 60
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`
  return String(Math.round(kg))
}

const PR_TYPE_LABELS: Record<string, string> = {
  best_weight: 'Max Weight',
  best_volume: 'Best Volume',
  best_1rm:    'Est. 1RM',
}

function formatPRValue(prType: string, value: number): string {
  if (prType === 'best_1rm') return `${value.toFixed(1)} kg`
  return `${formatVolume(value)} kg`
}

export function PostWorkoutSummary({ workout, prs, onDone }: PostWorkoutSummaryProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const stats = useMemo(() => {
    const startedAt  = workout.started_at instanceof Date ? workout.started_at : new Date(workout.started_at)
    const durationMs = Date.now() - startedAt.getTime()
    let totalSets   = 0, totalReps = 0, totalVolume = 0
    const muscleSet = new Set<string>()

    for (const ex of workout.exercises) {
      muscleSet.add(ex.exercise.muscle_group)
      for (const s of ex.sets) {
        if (!s.completed || s.is_warmup) continue
        totalSets   += 1
        totalReps   += s.reps
        totalVolume += s.weight_kg * s.reps
      }
    }

    return {
      durationMs,
      totalSets,
      totalReps,
      totalVolume,
      muscles: Array.from(muscleSet),
    }
  }, [workout])

  const uniquePRs = useMemo(
    () => Object.values(
      prs.reduce<Record<string, PREvaluationResult>>((acc, pr) => {
        const key = `${pr.exerciseName}|${pr.prType}`
        if (!acc[key] || pr.newValue > acc[key].newValue) acc[key] = pr
        return acc
      }, {}),
    ),
    [prs],
  )

  const handleDone = () => {
    setVisible(false)
    setTimeout(onDone, 300)
  }

  const handleCoachReview = () => {
    setVisible(false)
    setTimeout(() => {
      onDone()
      const musclesList = stats.muscles.join(', ') || 'various muscles'
      const prompt = `I just finished a workout (${stats.totalSets} working sets, ${formatVolume(stats.totalVolume)}kg volume) targeting ${musclesList}${uniquePRs.length > 0 ? ` with ${uniquePRs.length} new PRs` : ''}. Review my session and advise on recovery and my next workout.`
      router.push(`/coach?prompt=${encodeURIComponent(prompt)}`)
    }, 200)
  }

  const fadeIn = (delay = 0) =>
    `transition-all duration-500 ${delay ? `delay-[${delay}ms]` : ''} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto" style={{ background: 'var(--bg-0)' }}>

      {/* Hero header */}
      <div className={`flex flex-col items-center text-center px-6 pt-12 pb-8 ${fadeIn()}`}>
        <div
          className="w-16 h-16 rounded-[var(--radius-card)] flex items-center justify-center mb-4"
          style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}
        >
          <Check className="w-8 h-8" style={{ color: 'var(--accent)' }} strokeWidth={2.5} />
        </div>

        <p className="t-label mb-1" style={{ color: 'var(--accent)' }}>Workout Complete</p>
        <h1 className="t-display-m">
          {uniquePRs.length > 0
            ? `${uniquePRs.length} New Record${uniquePRs.length > 1 ? 's' : ''}!`
            : 'Crushed It.'}
        </h1>
        <p className="t-caption mt-1">{workout.title || 'Workout'}</p>
      </div>

      {/* Primary stats grid */}
      <div className={`grid grid-cols-2 gap-3 px-4 mb-4 ${fadeIn(100)}`}>
        <StatTile
          icon={<Clock className="w-4 h-4" />}
          label="Duration"
          value={formatDuration(stats.durationMs)}
        />
        <StatTile
          icon={<Dumbbell className="w-4 h-4" />}
          label="Total Volume"
          value={formatVolume(stats.totalVolume)}
          unit="kg"
          highlight={stats.totalVolume > 0}
        />
        <StatTile
          icon={<Layers className="w-4 h-4" />}
          label="Working Sets"
          value={String(stats.totalSets)}
        />
        <StatTile
          icon={<Repeat className="w-4 h-4" />}
          label="Total Reps"
          value={String(stats.totalReps)}
        />
      </div>

      {/* Muscle groups worked */}
      {stats.muscles.length > 0 && (
        <div className={`px-4 mb-4 ${fadeIn(150)}`}>
          <p className="t-label mb-2 px-1">Targeted Muscles</p>
          <div className="flex flex-wrap gap-1.5">
            {stats.muscles.map(m => (
              <span
                key={m}
                className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-[var(--radius-pill)] capitalize"
                style={{
                  background: 'var(--bg-2)',
                  color:      'var(--text-mid)',
                  border:     '1px solid var(--border)',
                }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* PRs */}
      {uniquePRs.length > 0 && (
        <div className={`px-4 mb-4 ${fadeIn(200)}`}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Trophy className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <p className="t-label" style={{ color: 'var(--accent)' }}>
              {uniquePRs.length === 1 ? 'New Record' : `${uniquePRs.length} New Records`}
            </p>
          </div>
          <div className="space-y-2">
            {uniquePRs.map((pr, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 rounded-[var(--radius-inner)]"
                style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[var(--text-hi)] truncate">{pr.exerciseName}</p>
                  <p className="text-[10px] text-[var(--text-faint)] mt-0.5">{PR_TYPE_LABELS[pr.prType] ?? pr.prType}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="mono text-base tabular-nums" style={{ color: 'var(--accent)' }}>
                    {formatPRValue(pr.prType, pr.newValue)}
                  </p>
                  {pr.oldValue !== null && (
                    <p className="mono text-[10px] text-[var(--text-faint)] tabular-nums">
                      prev {formatPRValue(pr.prType, pr.oldValue)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Coach Review CTA Card */}
      <div className={`px-4 mb-4 ${fadeIn(250)}`}>
        <div
          className="glass p-3.5 rounded-2xl flex items-center justify-between gap-3"
          style={{
            borderColor: 'rgba(45, 212, 191, 0.25)',
            background: 'linear-gradient(135deg, rgba(45,212,191,0.08) 0%, rgba(10,13,24,0.7) 100%)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-zinc-100 truncate">Review with AI Coach</p>
              <p className="text-[10px] text-zinc-400 truncate">Analyze volume load, fatigue & next steps</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCoachReview}
            className="shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold text-teal-300 bg-teal-500/15 border border-teal-500/30 hover:bg-teal-500/25 active:scale-95 transition-all"
          >
            Review →
          </button>
        </div>
      </div>

      <div className="flex-1" />

      {/* Done CTA */}
      <div
        className="sticky bottom-0 px-4 pb-8 pt-4"
        style={{ background: `linear-gradient(to top, var(--bg-0) 70%, transparent)` }}
      >
        <button
          onClick={handleDone}
          className="w-full h-14 rounded-[var(--radius-pill)] text-[13px] font-semibold uppercase tracking-widest transition-all active:scale-95 hover:opacity-90"
          style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
        >
          {uniquePRs.length > 0 ? (
            <span className="flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4" />
              Hell Yeah
            </span>
          ) : 'Done'}
        </button>
      </div>
    </div>
  )
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

interface StatTileProps {
  icon?:      React.ReactNode
  label:      string
  value:      string
  unit?:      string
  highlight?: boolean
}

function StatTile({ icon, label, value, unit, highlight = false }: StatTileProps) {
  return (
    <div
      className="glass p-4"
      style={highlight ? { borderColor: 'var(--accent-line)' } : {}}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {icon && (
          <span style={{ color: highlight ? 'var(--accent)' : 'var(--text-faint)' }}>{icon}</span>
        )}
        <p className="t-label">{label}</p>
      </div>
      <p
        className="mono text-3xl tracking-tighter tabular-nums"
        style={{ color: highlight ? 'var(--accent)' : 'var(--text-hi)', textShadow: highlight ? '0 0 24px var(--accent-glow)' : 'none' }}
      >
        {value}
        {unit && <span className="mono text-sm ml-1" style={{ color: highlight ? 'var(--accent-line)' : 'var(--text-faint)' }}>{unit}</span>}
      </p>
    </div>
  )
}
