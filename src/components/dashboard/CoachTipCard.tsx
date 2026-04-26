'use client'

import { useState } from 'react'
import { InsightCard } from './InsightCard'
import { ChevronRight } from 'lucide-react'

interface CoachTipCardProps {
  tips: string[]
}

export function CoachTipCard({ tips }: CoachTipCardProps) {
  const [index, setIndex] = useState(0)

  if (tips.length === 0) return null

  const advance = () => setIndex(i => (i + 1) % tips.length)

  return (
    <InsightCard title="Coach Tip" icon="💡" variant="neutral" dismissKey="coach-tip-dismiss">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] text-[#adb4ce] font-body leading-relaxed flex-1">
          {tips[index]}
        </p>
        {tips.length > 1 && (
          <button
            onClick={advance}
            className="shrink-0 text-[#334155] hover:text-[#CCFF00] transition-colors p-2.5 rounded-lg hover:bg-[#CCFF00]/5 -mr-1.5 -my-0.5"
            aria-label="Next tip"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      {tips.length > 1 && (
        <div className="flex gap-1 mt-3">
          {tips.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === index ? 'w-4 bg-[#CCFF00]' : 'w-1.5 bg-[#1e293b]'
              }`}
            />
          ))}
        </div>
      )}
    </InsightCard>
  )
}
