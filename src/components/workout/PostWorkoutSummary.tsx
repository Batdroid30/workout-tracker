'use client'

import { useEffect, useState, useMemo } from 'react'
import { Trophy, Clock, Dumbbell, Repeat, Layers, Check } from 'lucide-react'
import type { ActiveWorkout } from '@/types/database'
import type { PREvaluationResult } from '@/lib/data/stats'

// ─── Post-workout summary ─────────────────────────────────────────────────────
//
// Full-screen celebration that replaces the old PR-only modal. Shows what the
// user just did:
//   • Duration, total volume, total sets, total reps   (4-tile grid)
//   • Exercises completed (chips)
//   • Muscle groups hit                                 (chips)
//   • PRs achieved                                      (lime cards)
//
// All stats are computed client-side from the freshly-saved ActiveWorkout
// object — zero DB calls. The PR list comes back from finishWorkoutAction.

interface PostWorkoutSummaryProps {
  workout: ActiveWorkout
  prs:     PREvaluationResult[]
  onDone:  () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

  // Animate in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  // ── Stats — pure derivation, no DB ─────────────────────────────────────────
  const stats = useMemo(() => {
    const startedAt   = workout.started_at instanceof Date ? workout.started_at : new Date(workout.started_at)
    const durationMs  = Date.now() - startedAt.getTime()

    let totalSets    = 0
    let totalReps    = 0
    let totalVolume  = 0
    const muscleSet  = new Set<string>()

    for (const ex of workout.exercises) {
      muscleSet.add(ex.exercise.muscle_group)
      for (const s of ex.sets) {
        // Only count completed working sets — warmups & unchecked don't count
        if (!s.completed || s.is_warmup) continue
        totalSets   += 1
        totalReps   += s.reps
        totalVolume += s.weight_kg * s.reps
      }
    }

    return {
      duration:      formatDuration(durationMs),
      totalSets,
      totalReps,
      totalVolume,
      exerciseCount: workout.exercises.length,
      muscles:       Array.from(muscleSet),
    }
  }, [workout])

  // Deduplicate PRs by exercise + type, keeping highest value
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070d1f] overflow-y-auto">

      {/* ── Hero header ───────────────────────────────────────────────────── */}
      <div
        className={`flex flex-col items-center text-center px-6 pt-12 pb-8 transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="w-16 h-16 bg-[#CCFF00]/10 border border-[#CCFF00]/30 rounded-2xl flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-[#CCFF00]" strokeWidth={3} />
        </div>
        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#4a5568] mb-1">
          Workout Complete
        </p>
        <h1 className="text-3xl font-black italic uppercase tracking-tight text-white mb-1">
          {workout.title || 'Session'}
        </h1>
        <div className="flex items-center gap-1.5 text-[#adb4ce]">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-sm font-body tabular-nums">{stats.duration}</span>
        </div>
      </div>

      {/* ── Stat grid ─────────────────────────────────────────────────────── */}
      <div
        className={`px-4 grid grid-cols-2 gap-3 mb-6 transition-all duration-500 delay-75 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <StatTile
          icon={<Dumbbell className="w-4 h-4" />}
          label="Volume"
          value={formatVolume(stats.totalVolume)}
          unit="kg"
          highlight
        />
        <StatTile
          icon={<Layers className="w-4 h-4" />}
          label="Sets"
          value={String(stats.totalSets)}
        />
        <StatTile
          icon={<Repeat className="w-4 h-4" />}
          label="Reps"
          value={String(stats.totalReps)}
        />
        <StatTile
          label="Exercises"
          value={String(stats.exerciseCount)}
        />
      </div>

      {/* ── Muscle groups hit ─────────────────────────────────────────────── */}
      {stats.muscles.length > 0 && (
        <div
          className={`px-4 mb-6 transition-all duration-500 delay-150 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#4a5568] mb-2 px-1">
            Muscles hit
          </p>
          <div className="flex flex-wrap gap-1.5">
            {stats.muscles.map(m => (
              <span
                key={m}
                className="text-[11px] font-black uppercase tracking-tight text-[#adb4ce] bg-[#0c1324] border border-[#334155] rounded-lg px-2.5 py-1"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── PRs achieved ──────────────────────────────────────────────────── */}
      {uniquePRs.length > 0 && (
        <div
          className={`px-4 mb-6 transition-all duration-500 delay-200 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center gap-2 mb-2 px-1">
            <Trophy className="w-3.5 h-3.5 text-[#CCFF00]" />
            <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#CCFF00]">
              {uniquePRs.length === 1 ? 'New Record' : `${uniquePRs.length} New Records`}
            </p>
          </div>
          <div className="space-y-2">
            {uniquePRs.map((pr, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-[#CCFF00]/5 border border-[#CCFF00]/20 rounded-xl px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white uppercase tracking-tight truncate">
                    {pr.exerciseName}
                  </p>
                  <p className="text-[10px] text-[#4a5568] font-body tracking-wide mt-0.5">
                    {PR_TYPE_LABELS[pr.prType] ?? pr.prType}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-base font-black text-[#CCFF00] tracking-tight tabular-nums">
                    {formatPRValue(pr.prType, pr.newValue)}
                  </p>
                  {pr.oldValue !== null && (
                    <p className="text-[10px] text-[#4a5568] font-body tabular-nums">
                      prev {formatPRValue(pr.prType, pr.oldValue)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Spacer to push CTA off the bottom on tall content ─────────────── */}
      <div className="flex-1" />

      {/* ── Done CTA — sticky at the bottom ───────────────────────────────── */}
      <div className="sticky bottom-0 px-4 pb-6 pt-4 bg-gradient-to-t from-[#070d1f] via-[#070d1f] to-transparent">
        <button
          onClick={handleDone}
          className="w-full h-14 bg-[#CCFF00] text-[#020617] font-black uppercase tracking-widest text-sm rounded-xl active:scale-95 transition-transform hover:bg-[#abd600]"
        >
          {uniquePRs.length > 0 ? 'Hell Yeah 🔥' : 'Done'}
        </button>
      </div>
    </div>
  )
}

// ─── Stat tile ───────────────────────────────────────────────────────────────

interface StatTileProps {
  icon?:     React.ReactNode
  label:     string
  value:     string
  unit?:     string
  highlight?: boolean
}

function StatTile({ icon, label, value, unit, highlight = false }: StatTileProps) {
  return (
    <div className={`glass-panel rounded-xl p-4 border ${highlight ? 'border-[#CCFF00]/30' : 'border-[#334155]'}`}>
      <div className="flex items-center gap-1.5 mb-2">
        {icon && <span className={highlight ? 'text-[#CCFF00]/60' : 'text-[#4a5568]'}>{icon}</span>}
        <p className="text-[10px] font-black tracking-[0.15em] uppercase text-[#4a5568]">
          {label}
        </p>
      </div>
      <p className={`text-3xl font-black tracking-tighter tabular-nums ${highlight ? 'text-[#CCFF00]' : 'text-white'}`}>
        {value}
        {unit && (
          <span className={`text-sm ml-1 ${highlight ? 'text-[#CCFF00]/40' : 'text-[#334155]'}`}>
            {unit}
          </span>
        )}
      </p>
    </div>
  )
}
