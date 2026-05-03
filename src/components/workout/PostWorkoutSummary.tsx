'use client'

import { useEffect, useState, useMemo } from 'react'
import { Trophy, Clock, Dumbbell, Repeat, Layers, Check } from 'lucide-react'
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
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k kg`
  return `${value} kg`
}

export function PostWorkoutSummary({ workout, prs, onDone }: PostWorkoutSummaryProps) {
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
      duration: formatDuration(durationMs),
      totalSets, totalReps, totalVolume,
      exerciseCount: workout.exercises.length,
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
        <p className="t-label mb-1">Workout Complete</p>
        <h1 className="t-display-m italic mb-1" style={{ fontStyle: 'italic' }}>
          {workout.title || 'Session'}
        </h1>
        <div className="flex items-center gap-1.5 text-[var(--text-mid)]">
          <Clock className="w-3.5 h-3.5" />
          <span className="mono text-sm tabular-nums">{stats.duration}</span>
        </div>
      </div>

      {/* Stat grid */}
      <div className={`px-4 grid grid-cols-2 gap-3 mb-6 ${fadeIn(75)}`}>
        <StatTile icon={<Dumbbell className="w-4 h-4" />} label="Volume" value={formatVolume(stats.totalVolume)} unit="kg" highlight />
        <StatTile icon={<Layers className="w-4 h-4" />}   label="Sets"      value={String(stats.totalSets)}     />
        <StatTile icon={<Repeat className="w-4 h-4" />}   label="Reps"      value={String(stats.totalReps)}     />
        <StatTile                                          label="Exercises" value={String(stats.exerciseCount)} />
      </div>

      {/* Muscles hit */}
      {stats.muscles.length > 0 && (
        <div className={`px-4 mb-6 ${fadeIn(150)}`}>
          <p className="t-label mb-2 px-1">Muscles hit</p>
          <div className="flex flex-wrap gap-1.5">
            {stats.muscles.map(m => (
              <span
                key={m}
                className="text-[11px] font-medium text-[var(--text-mid)] capitalize px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* PRs */}
      {uniquePRs.length > 0 && (
        <div className={`px-4 mb-6 ${fadeIn(200)}`}>
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
          {uniquePRs.length > 0 ? 'Hell Yeah 🔥' : 'Done'}
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
