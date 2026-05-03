'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Pencil, Target, X } from 'lucide-react'
import { updateWeeklyGoalAction } from '@/app/(app)/profile/actions'
import { cn } from '@/lib/utils'
import type { Mission, MissionPriority } from '@/lib/data/phase-coach'
import type { WeeklySummary, NextWorkoutSuggestion } from '@/lib/data/insights'

interface ThisWeekCardProps {
  thisWeekCount:  number
  goalSessions:   number
  weeklySummary:  WeeklySummary
  missions:       Mission[]
  nextWorkout:    NextWorkoutSuggestion | null
}

const PRIORITY_BAR: Record<MissionPriority, string> = {
  critical: 'bg-[var(--rose)]',
  high:     'bg-orange-400',
  normal:   'bg-[var(--accent)]/40',
}

export function ThisWeekCard({
  thisWeekCount,
  goalSessions,
  weeklySummary,
  missions,
  nextWorkout,
}: ThisWeekCardProps) {
  const [editing,   setEditing]   = useState(false)
  const [draftGoal, setDraftGoal] = useState(goalSessions)
  const [isPending, startTransition] = useTransition()

  const sessionPct = Math.min(100, Math.round((thisWeekCount / goalSessions) * 100))
  const reached    = thisWeekCount >= goalSessions
  const remaining  = Math.max(0, goalSessions - thisWeekCount)

  const saveGoal = () => {
    startTransition(async () => {
      await updateWeeklyGoalAction(draftGoal)
      setEditing(false)
    })
  }

  return (
    <div className="glass border border-[var(--accent-line)] p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-3.5 h-3.5 text-[var(--accent)]" />
        <h3 className="t-label">This Week</h3>
      </div>

      {/* Sessions + progress */}
      <div className="mb-4">
        {editing ? (
          <GoalEditor
            draftGoal={draftGoal}
            isPending={isPending}
            onChange={setDraftGoal}
            onSave={saveGoal}
            onCancel={() => { setEditing(false); setDraftGoal(goalSessions) }}
          />
        ) : (
          <div>
            <div className="flex items-end justify-between mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className="mono text-3xl font-medium text-[var(--text-hi)] tabular-nums">{thisWeekCount}</span>
                <span className="text-sm text-[var(--text-faint)]">/ {goalSessions}</span>
                <span className="text-[10px] text-[var(--text-low)] ml-1">sessions</span>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors p-1.5 rounded-lg"
                aria-label="Edit weekly goal"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>

            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${sessionPct}%`,
                  background: reached ? 'var(--accent)' : 'var(--accent)',
                  opacity: reached ? 1 : 0.5,
                  boxShadow: reached ? '0 0 12px var(--accent-glow)' : 'none',
                }}
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              {reached ? (
                <p className="t-label text-[var(--accent)]">Goal reached</p>
              ) : (
                <p className="t-caption">{remaining} more session{remaining !== 1 ? 's' : ''} to go</p>
              )}
              <VolumeDelta pct={weeklySummary.volumeChangePct} />
            </div>
          </div>
        )}
      </div>

      {/* Missions */}
      {missions.length > 0 && (
        <div className="mb-4">
          <p className="t-label mb-2">Missions</p>
          <div className="space-y-2">
            {missions.map(m => (
              <div key={m.id} className="flex gap-3 py-1.5">
                <div className={cn('w-0.5 rounded-full self-stretch shrink-0', PRIORITY_BAR[m.priority])} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-hi)]">{m.headline}</p>
                  <p className="text-[11px] text-[var(--text-low)] mt-0.5 leading-relaxed">{m.detail}</p>
                </div>
                <span className="text-base shrink-0 leading-none mt-0.5">{m.icon}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next session footer */}
      <div className="flex items-center gap-3 pt-3 border-t border-white/[0.05]">
        <div className="flex-1 min-w-0">
          {nextWorkout ? (
            <>
              <p className="t-label mb-1">Next session</p>
              <p className="text-[13px] font-medium text-[var(--text-hi)] truncate">{nextWorkout.focus}</p>
              <p className="text-[10px] text-[var(--text-low)] truncate mt-0.5">{nextWorkout.reason}</p>
            </>
          ) : (
            <>
              <p className="t-label mb-1">Ready when you are</p>
              <p className="text-[10px] text-[var(--text-low)] mt-0.5">Pick any session to keep momentum.</p>
            </>
          )}
        </div>
        <Link href="/routines">
          <button className="shrink-0 flex items-center gap-1 bg-[var(--accent)] text-[var(--accent-on)] text-[10px] font-semibold uppercase tracking-widest px-3 py-2 rounded-lg active:scale-95 transition-transform">
            Start <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
      </div>
    </div>
  )
}

interface GoalEditorProps {
  draftGoal: number
  isPending: boolean
  onChange:  (n: number) => void
  onSave:    () => void
  onCancel:  () => void
}

function GoalEditor({ draftGoal, isPending, onChange, onSave, onCancel }: GoalEditorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-[var(--text-low)]">Sessions per week:</span>
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => onChange(Math.max(1, draftGoal - 1))}
          className="w-7 h-7 bg-white/[0.04] border border-[var(--glass-border)] rounded-lg text-[var(--text-mid)] flex items-center justify-center hover:border-[var(--accent-line)] transition-colors"
        >−</button>
        <span className="w-6 text-center text-sm font-medium text-[var(--text-hi)] mono tabular-nums">{draftGoal}</span>
        <button
          onClick={() => onChange(Math.min(14, draftGoal + 1))}
          className="w-7 h-7 bg-white/[0.04] border border-[var(--glass-border)] rounded-lg text-[var(--text-mid)] flex items-center justify-center hover:border-[var(--accent-line)] transition-colors"
        >+</button>
      </div>
      <button
        onClick={onSave}
        disabled={isPending}
        className="ml-2 w-7 h-7 bg-[var(--accent)] text-[var(--accent-on)] rounded-lg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onCancel}
        className="w-7 h-7 bg-white/[0.04] border border-[var(--glass-border)] rounded-lg text-[var(--text-low)] flex items-center justify-center hover:text-[var(--text-hi)] transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function VolumeDelta({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="t-caption">—</span>
  if (pct === 0)    return <span className="t-caption">same volume</span>
  const up = pct > 0
  return (
    <span className={cn('text-[10px] font-medium mono', up ? 'text-[var(--teal)]' : 'text-[var(--rose)]')}>
      {up ? '↑' : '↓'} {Math.abs(pct)}% vol
    </span>
  )
}
