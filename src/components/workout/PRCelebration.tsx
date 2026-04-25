'use client'

import { useEffect, useState } from 'react'
import { Trophy, X } from 'lucide-react'
import type { PREvaluationResult } from '@/lib/data/stats'

interface PRCelebrationProps {
  prs: PREvaluationResult[]
  onClose: () => void
}

const PR_TYPE_LABELS: Record<string, string> = {
  best_weight: 'Max Weight',
  best_volume: 'Best Volume',
  best_1rm:    'Est. 1RM',
}

const PR_TYPE_UNITS: Record<string, string> = {
  best_weight: 'kg',
  best_volume: 'kg',
  best_1rm:    'kg',
}

function formatValue(prType: string, value: number): string {
  if (prType === 'best_1rm') return `${value.toFixed(1)} kg`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k kg`
  return `${value} kg`
}

export function PRCelebration({ prs, onClose }: PRCelebrationProps) {
  const [visible, setVisible] = useState(false)

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  // Deduplicate by exercise + pr_type, keeping highest value
  const uniquePRs = Object.values(
    prs.reduce<Record<string, PREvaluationResult>>((acc, pr) => {
      const key = `${pr.exerciseName}|${pr.prType}`
      if (!acc[key] || pr.newValue > acc[key].newValue) acc[key] = pr
      return acc
    }, {})
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={`relative w-full max-w-lg bg-[#0c1324] border-t border-[#CCFF00]/20 rounded-t-2xl p-6 pb-10 transition-transform duration-300 ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-[#334155] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#151b2d]"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#CCFF00]/10 border border-[#CCFF00]/20 rounded-xl flex items-center justify-center">
            <Trophy className="w-6 h-6 text-[#CCFF00]" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white">
              {uniquePRs.length === 1 ? 'New Record!' : `${uniquePRs.length} New Records!`}
            </h2>
            <p className="text-[11px] text-[#4a5568] font-body tracking-wide mt-0.5">
              You crushed it today. Keep pushing.
            </p>
          </div>
        </div>

        {/* PR list */}
        <div className="space-y-2">
          {uniquePRs.map((pr, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-[#CCFF00]/5 border border-[#CCFF00]/10 rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-sm font-black text-white uppercase tracking-tight">{pr.exerciseName}</p>
                <p className="text-[10px] text-[#4a5568] font-body tracking-wide mt-0.5">
                  {PR_TYPE_LABELS[pr.prType] ?? pr.prType}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-black text-[#CCFF00] tracking-tight">
                  {formatValue(pr.prType, pr.newValue)}
                </p>
                {pr.oldValue !== null && (
                  <p className="text-[10px] text-[#4a5568] font-body">
                    prev {formatValue(pr.prType, pr.oldValue)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleClose}
          className="w-full mt-6 h-12 bg-[#CCFF00] text-[#020617] font-black uppercase tracking-widest text-sm rounded-xl active:scale-95 transition-transform hover:bg-[#abd600]"
        >
          Hell Yeah 🔥
        </button>
      </div>
    </div>
  )
}
