'use client'

import { useState, useTransition } from 'react'
import { InsightCard } from './InsightCard'
import { Target, Pencil, Check, X } from 'lucide-react'
import { updateWeeklyGoalAction } from '@/app/(app)/profile/actions'

interface WeeklyGoalCardProps {
  thisWeekCount: number
  goalSessions: number
}

export function WeeklyGoalCard({ thisWeekCount, goalSessions }: WeeklyGoalCardProps) {
  const [editing,    setEditing]    = useState(false)
  const [draftGoal,  setDraftGoal]  = useState(goalSessions)
  const [isPending,  startTransition] = useTransition()

  const pct     = Math.min(100, Math.round((thisWeekCount / goalSessions) * 100))
  const reached = thisWeekCount >= goalSessions

  const saveGoal = () => {
    startTransition(async () => {
      await updateWeeklyGoalAction(draftGoal)
      setEditing(false)
    })
  }

  return (
    <InsightCard title="Weekly Goal" icon={<Target className="w-3.5 h-3.5 text-[#CCFF00]" />} variant="neutral">
      {editing ? (
        /* ── Goal editor ── */
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#4a5568] font-body">Sessions per week:</span>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setDraftGoal(g => Math.max(1, g - 1))}
              className="w-7 h-7 bg-[#151b2d] border border-[#334155] rounded-lg text-[#adb4ce] font-black flex items-center justify-center hover:border-[#CCFF00]/40 transition-colors"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-black text-white tabular-nums">{draftGoal}</span>
            <button
              onClick={() => setDraftGoal(g => Math.min(14, g + 1))}
              className="w-7 h-7 bg-[#151b2d] border border-[#334155] rounded-lg text-[#adb4ce] font-black flex items-center justify-center hover:border-[#CCFF00]/40 transition-colors"
            >
              +
            </button>
          </div>
          <button
            onClick={saveGoal}
            disabled={isPending}
            className="ml-2 w-7 h-7 bg-[#CCFF00] text-[#020617] rounded-lg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setEditing(false); setDraftGoal(goalSessions) }}
            className="w-7 h-7 bg-[#151b2d] border border-[#334155] rounded-lg text-[#4a5568] flex items-center justify-center hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* ── Progress display ── */
        <div>
          <div className="flex items-end justify-between mb-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white tabular-nums">{thisWeekCount}</span>
              <span className="text-sm text-[#4a5568] font-black">/ {goalSessions}</span>
              <span className="text-[10px] text-[#4a5568] font-body tracking-wide ml-1">sessions this week</span>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="text-[#334155] hover:text-[#CCFF00] transition-colors p-1.5 rounded-lg hover:bg-[#CCFF00]/5 -mr-1"
              aria-label="Edit weekly goal"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                reached ? 'bg-[#CCFF00]' : 'bg-[#CCFF00]/50'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {reached ? (
            <p className="text-[10px] text-[#CCFF00] font-black uppercase tracking-widest mt-2">
              Goal crushed! 🔥
            </p>
          ) : (
            <p className="text-[10px] text-[#4a5568] font-body tracking-wide mt-2">
              {goalSessions - thisWeekCount} more session{goalSessions - thisWeekCount !== 1 ? 's' : ''} to hit your goal
            </p>
          )}
        </div>
      )}
    </InsightCard>
  )
}
