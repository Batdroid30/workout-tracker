'use client'

import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import type { PRCheckResult, PRType } from '@/types/database'

interface PRBannerProps {
  prs: PRCheckResult[]
  exerciseName: string
  onDismiss: () => void
  /** Auto-dismiss after this many ms. Default 5000. */
  duration?: number
}

const PR_CONFIG: Record<PRType, { label: string; color: string; bg: string }> = {
  best_weight: { label: 'Weight PR', color: 'text-yellow-300', bg: 'bg-yellow-400/15' },
  best_1rm:    { label: 'Est. 1RM',  color: 'text-sky-300',    bg: 'bg-sky-400/15'    },
  best_volume: { label: 'Volume',    color: 'text-violet-300', bg: 'bg-violet-400/15' },
}

function formatValue(prType: PRType, value: number): string {
  if (prType === 'best_1rm') return `${value.toFixed(1)} kg`
  if (prType === 'best_volume') {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k kg` : `${value} kg`
  }
  return `${value} kg`
}

export function PRBanner({ prs, exerciseName, onDismiss, duration = 5000 }: PRBannerProps) {
  const [visible,  setVisible]  = useState(false)
  const [progress, setProgress] = useState(100)

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  // Shrink the countdown bar, then dismiss
  useEffect(() => {
    const step = 50                          // update every 50 ms
    const decrement = (step / duration) * 100
    const interval = setInterval(() => {
      setProgress(p => {
        if (p <= 0) { clearInterval(interval); return 0 }
        return p - decrement
      })
    }, step)
    const dismissTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, duration)
    return () => { clearInterval(interval); clearTimeout(dismissTimer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (prs.length === 0) return null

  return (
    /* Fixed above the nav bar — same z-layer as RestTimer */
    <div
      className={`fixed bottom-[72px] left-3 right-3 z-50 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      }`}
    >
      <div className="bg-[#0c1324] border border-[#CCFF00]/30 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#CCFF00]/10 border border-[#CCFF00]/20 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-[#CCFF00]" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#CCFF00]">
                {prs.length === 1 ? 'New Record' : `${prs.length} New Records`}
              </p>
              <p className="text-[10px] text-[#4a5568] font-body truncate max-w-[180px]">{exerciseName}</p>
            </div>
          </div>
          <button
            onPointerDown={onDismiss}
            className="text-[9px] font-black uppercase tracking-widest text-[#4a5568] hover:text-white bg-[#151b2d] px-2.5 py-1.5 rounded-lg transition-colors active:scale-95"
          >
            Got it
          </button>
        </div>

        {/* PR rows */}
        <div className="px-4 pb-3 space-y-1.5">
          {prs.map(pr => {
            const cfg = PR_CONFIG[pr.pr_type]
            return (
              <div
                key={pr.pr_type}
                className={`flex items-center justify-between rounded-xl px-3 py-2 ${cfg.bg}`}
              >
                <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>
                  {cfg.label}
                </span>
                <span className="text-sm font-black text-white tabular-nums">
                  {pr.old_value !== null && (
                    <span className="text-[10px] text-[#4a5568] font-body mr-2 line-through">
                      {formatValue(pr.pr_type, pr.old_value)}
                    </span>
                  )}
                  {formatValue(pr.pr_type, pr.new_value)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Countdown bar */}
        <div className="h-0.5 bg-[#151b2d]">
          <div
            className="h-full bg-[#CCFF00]/60 transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
