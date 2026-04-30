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
  critical: 'bg-red-500',
  high:     'bg-orange-400',
  normal:   'bg-[#CCFF00]/40',
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
    <div className="glass-panel border border-[#CCFF00]/30 rounded-xl p-4">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-[#CCFF00]" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#adb4ce]">
            This Week
          </h3>
        </div>
      </div>

      {/* ── Sessions + volume delta ─────────────────────────────────── */}
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
                <span className="text-3xl font-black text-white tabular-nums">{thisWeekCount}</span>
                <span className="text-sm text-[#4a5568] font-black">/ {goalSessions}</span>
                <span className="text-[10px] text-[#4a5568] font-body tracking-wide ml-1">sessions</span>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="text-[#334155] hover:text-[#CCFF00] transition-colors p-1.5 rounded-lg hover:bg-[#CCFF00]/5 -mr-1"
                aria-label="Edit weekly goal"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>

            <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  reached ? 'bg-[#CCFF00]' : 'bg-[#CCFF00]/50',
                )}
                style={{ width: `${sessionPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              {reached ? (
                <p className="text-[10px] text-[#CCFF00] font-black uppercase tracking-widest">
                  Goal crushed
                </p>
              ) : (
                <p className="text-[10px] text-[#4a5568] font-body tracking-wide">
                  {remaining} more session{remaining !== 1 ? 's' : ''} to hit your goal
                </p>
              )}
              <VolumeDelta pct={weeklySummary.volumeChangePct} />
            </div>
          </div>
        )}
      </div>

      {/* ── Missions list ───────────────────────────────────────────── */}
      {missions.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4a5568] mb-2">
            Missions
          </p>
          <div className="space-y-2">
            {missions.map(m => (
              <div key={m.id} className="flex gap-3 py-1.5">
                <div className={cn('w-0.5 rounded-full self-stretch shrink-0', PRIORITY_BAR[m.priority])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white tracking-tight uppercase">
                    {m.headline}
                  </p>
                  <p className="text-[11px] text-[#4a5568] font-body mt-0.5 leading-relaxed">
                    {m.detail}
                  </p>
                </div>
                <span className="text-base shrink-0 leading-none mt-0.5">{m.icon}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Next session footer + start button ──────────────────────── */}
      <div className="flex items-center gap-3 pt-3 border-t border-[#1e293b]">
        <div className="flex-1 min-w-0">
          {nextWorkout ? (
            <>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4a5568]">Next session</p>
              <p className="text-xs font-black text-white uppercase tracking-tight truncate">
                {nextWorkout.focus}
              </p>
              <p className="text-[10px] text-[#4a5568] font-body truncate mt-0.5">{nextWorkout.reason}</p>
            </>
          ) : (
            <>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4a5568]">Ready when you are</p>
              <p className="text-[10px] text-[#4a5568] font-body mt-0.5">Pick any session to keep momentum.</p>
            </>
          )}
        </div>
        <Link href="/workout">
          <button className="shrink-0 flex items-center gap-1 bg-[#CCFF00] text-[#020617] font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-lg active:scale-95 transition-transform hover:bg-[#abd600]">
            Start <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
      </div>
    </div>
  )
}

// ─── Inline goal editor ─────────────────────────────────────────────────────

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
      <span className="text-[11px] text-[#4a5568] font-body">Sessions per week:</span>
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => onChange(Math.max(1, draftGoal - 1))}
          className="w-7 h-7 bg-[#151b2d] border border-[#334155] rounded-lg text-[#adb4ce] font-black flex items-center justify-center hover:border-[#CCFF00]/40 transition-colors"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-black text-white tabular-nums">{draftGoal}</span>
        <button
          onClick={() => onChange(Math.min(14, draftGoal + 1))}
          className="w-7 h-7 bg-[#151b2d] border border-[#334155] rounded-lg text-[#adb4ce] font-black flex items-center justify-center hover:border-[#CCFF00]/40 transition-colors"
        >
          +
        </button>
      </div>
      <button
        onClick={onSave}
        disabled={isPending}
        className="ml-2 w-7 h-7 bg-[#CCFF00] text-[#020617] rounded-lg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onCancel}
        className="w-7 h-7 bg-[#151b2d] border border-[#334155] rounded-lg text-[#4a5568] flex items-center justify-center hover:text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Volume vs last week ───────────────────────────────────────────────────

function VolumeDelta({ pct }: { pct: number | null }) {
  if (pct === null)  return <span className="text-[10px] text-[#334155]">—</span>
  if (pct === 0)     return <span className="text-[10px] text-[#4a5568] font-black">→ same volume</span>
  const positive = pct > 0
  return (
    <span className={cn('text-[10px] font-black', positive ? 'text-[#CCFF00]' : 'text-red-400')}>
      {positive ? '↑' : '↓'} {Math.abs(pct)}% volume
    </span>
  )
}
