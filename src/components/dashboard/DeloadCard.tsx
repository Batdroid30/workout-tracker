'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { InsightCard } from './InsightCard'
import type { FatigueAssessment } from '@/lib/algorithms'

const CONFIDENCE_COPY = {
  low:    'Your data suggests a lighter week could help.',
  medium: 'Your body is likely due for a deload this week.',
  high:   'Strong signs you need a deload week — your progress is stalling.',
} as const

interface DeloadCardProps {
  assessment: FatigueAssessment
}

export function DeloadCard({ assessment }: DeloadCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <InsightCard
      title="Recovery Check"
      icon="🔋"
      variant="warning"
      dismissKey="deload_dismissed_at"
    >
      <p className="text-sm text-[#dce1fb] font-body leading-relaxed mb-3">
        {CONFIDENCE_COPY[assessment.confidence]}
      </p>

      <div className="space-y-1.5 mb-3">
        {assessment.signals.map((signal, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-orange-400 text-xs mt-0.5">✦</span>
            <p className="text-[11px] text-[#adb4ce] font-body">{signal}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] font-black text-[#4a5568] hover:text-[#adb4ce] uppercase tracking-widest transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        What is a deload?
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#1e293b] space-y-2">
          <p className="text-[11px] text-[#4a5568] font-body leading-relaxed">
            A deload is a planned lighter training week. Same frequency, but reduce your working weight by ~30–40% and stay 3+ reps away from failure.
          </p>
          <p className="text-[11px] text-[#4a5568] font-body leading-relaxed">
            It lets your joints, tendons, and nervous system recover so you can come back stronger the following week.
          </p>
          <div className="bg-[#0c1324] rounded-lg p-3 mt-2 space-y-1.5 border border-[#1e293b]">
            <p className="text-[10px] font-black text-[#CCFF00] uppercase tracking-widest mb-2">This week, aim for:</p>
            <p className="text-[11px] text-[#adb4ce] font-body">· Same days, same exercises</p>
            <p className="text-[11px] text-[#adb4ce] font-body">· 60% of your usual working weight</p>
            <p className="text-[11px] text-[#adb4ce] font-body">· Stop 3–4 reps before failure on every set</p>
            <p className="text-[11px] text-[#adb4ce] font-body">· One week only, then back to normal</p>
          </div>
        </div>
      )}
    </InsightCard>
  )
}
