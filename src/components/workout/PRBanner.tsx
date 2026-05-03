'use client'

import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import type { PRCheckResult, PRType } from '@/types/database'

interface PRBannerProps {
  prs: PRCheckResult[]
  exerciseName: string
  onDismiss: () => void
  duration?: number
}

const PR_CONFIG: Record<PRType, { label: string; color: string; bg: string }> = {
  best_weight: { label: 'Weight PR', color: 'text-yellow-300', bg: 'bg-yellow-400/15' },
  best_1rm:    { label: 'Est. 1RM',  color: 'text-sky-300',    bg: 'bg-sky-400/15'    },
  best_volume: { label: 'Volume',    color: 'text-violet-300', bg: 'bg-violet-400/15' },
}

function formatValue(prType: PRType, value: number): string {
  if (prType === 'best_1rm') return `${value.toFixed(1)} kg`
  if (prType === 'best_volume') return value >= 1000 ? `${(value / 1000).toFixed(1)}k kg` : `${value} kg`
  return `${value} kg`
}

export function PRBanner({ prs, exerciseName, onDismiss, duration = 5000 }: PRBannerProps) {
  const [visible,  setVisible]  = useState(false)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const step      = 50
    const decrement = (step / duration) * 100
    const interval  = setInterval(() => {
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
    <div
      className={`fixed bottom-[72px] left-3 right-3 z-50 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      }`}
    >
      <div
        className="rounded-[var(--radius-card)] shadow-2xl shadow-black/60 overflow-hidden"
        style={{
          background: 'rgba(10,13,24,0.97)',
          backdropFilter: 'blur(28px)',
          border: '1px solid var(--accent-line)',
          boxShadow: '0 0 40px rgba(243,192,138,0.12)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-[var(--radius-inner)] flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}
            >
              <Trophy className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                {prs.length === 1 ? 'New Record' : `${prs.length} New Records`}
              </p>
              <p className="text-[10px] text-[var(--text-faint)] truncate max-w-[180px]">{exerciseName}</p>
            </div>
          </div>
          <button
            onPointerDown={onDismiss}
            className="text-[9px] font-medium uppercase tracking-widest text-[var(--text-low)] hover:text-[var(--text-hi)] px-2.5 py-1.5 rounded-lg transition-colors active:scale-95"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}
          >
            Got it
          </button>
        </div>

        {/* PR rows — keep their distinct colours for type differentiation */}
        <div className="px-4 pb-3 space-y-1.5">
          {prs.map(pr => {
            const cfg = PR_CONFIG[pr.pr_type]
            return (
              <div key={pr.pr_type} className={`flex items-center justify-between rounded-[var(--radius-inner)] px-3 py-2 ${cfg.bg}`}>
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                <span className="mono text-sm text-[var(--text-hi)] tabular-nums">
                  {pr.old_value !== null && (
                    <span className="text-[10px] text-[var(--text-faint)] mr-2 line-through">{formatValue(pr.pr_type, pr.old_value)}</span>
                  )}
                  {formatValue(pr.pr_type, pr.new_value)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Countdown bar */}
        <div className="h-0.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full transition-none"
            style={{ width: `${progress}%`, background: 'var(--accent)' }}
          />
        </div>
      </div>
    </div>
  )
}
