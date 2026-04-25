import { InsightCard } from './InsightCard'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { NextWorkoutSuggestion } from '@/lib/data/insights'

interface NextWorkoutCardProps {
  suggestion: NextWorkoutSuggestion
}

export function NextWorkoutCard({ suggestion }: NextWorkoutCardProps) {
  return (
    <InsightCard title="Coach Recommends" icon="🎯" variant="positive" dismissKey="next-workout-dismiss">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-black text-white uppercase tracking-tight mb-1">
            {suggestion.focus}
          </p>
          <p className="text-[11px] text-[#4a5568] font-body mb-2 tracking-wide">
            {suggestion.reason}
          </p>
          {suggestion.muscleGroups.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestion.muscleGroups.map(m => (
                <span
                  key={m}
                  className="text-[9px] font-black uppercase tracking-widest text-[#CCFF00]/70 bg-[#CCFF00]/5 border border-[#CCFF00]/10 rounded px-2 py-0.5"
                >
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
        <Link href="/workout">
          <button className="shrink-0 ml-4 flex items-center gap-1 bg-[#CCFF00] text-[#020617] font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-lg active:scale-95 transition-transform hover:bg-[#abd600]">
            Start <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
      </div>
    </InsightCard>
  )
}
