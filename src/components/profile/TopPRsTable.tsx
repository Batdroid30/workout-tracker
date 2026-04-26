import Link from 'next/link'
import { Trophy } from 'lucide-react'
import type { TopPR } from '@/lib/data/stats'

interface TopPRsTableProps {
  prs: TopPR[]
}

// Group label colour per muscle group
const MUSCLE_COLOURS: Record<string, string> = {
  chest:      'bg-blue-500/10   text-blue-400   border-blue-500/20',
  back:       'bg-purple-500/10 text-purple-400 border-purple-500/20',
  legs:       'bg-green-500/10  text-green-400  border-green-500/20',
  shoulders:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  arms:       'bg-pink-500/10   text-pink-400   border-pink-500/20',
  core:       'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
}

function muscleColour(group: string): string {
  return MUSCLE_COLOURS[group.toLowerCase()] ?? 'bg-[#1e293b] text-[#adb4ce] border-[#334155]'
}

export function TopPRsTable({ prs }: TopPRsTableProps) {
  if (prs.length === 0) {
    return (
      <div className="glass-panel border border-[#334155] rounded-xl p-6 text-center">
        <Trophy className="w-8 h-8 text-[#334155] mx-auto mb-3" />
        <p className="text-sm font-black text-[#4a5568] uppercase tracking-tight">No PRs yet</p>
        <p className="text-[11px] text-[#334155] font-body mt-1">Complete a few sets to start setting records.</p>
      </div>
    )
  }

  return (
    <div className="glass-panel border border-[#334155] rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e293b] bg-[#0c1324]">
        <span className="w-5 shrink-0" />
        <span className="flex-1 text-[9px] font-black text-[#334155] uppercase tracking-widest">Exercise</span>
        <span className="w-16 text-right text-[9px] font-black text-[#334155] uppercase tracking-widest">e1RM</span>
        <span className="w-20 text-right text-[9px] font-black text-[#334155] uppercase tracking-widest">Best Set</span>
      </div>

      {/* Rows */}
      {prs.map((pr, idx) => (
        <Link
          key={pr.exerciseId}
          href={`/exercises/${pr.exerciseId}`}
          className="flex items-center gap-2 px-4 py-3 border-b border-[#1e293b] last:border-0 hover:bg-[#151b2d] transition-colors active:bg-[#1e293b]"
        >
          {/* Rank badge */}
          <div className={`w-5 h-5 shrink-0 rounded flex items-center justify-center text-[9px] font-black
            ${idx === 0 ? 'bg-[#CCFF00]/20 text-[#CCFF00]' : 'text-[#334155]'}
          `}>
            {idx === 0 ? <Trophy className="w-3 h-3" /> : idx + 1}
          </div>

          {/* Name + muscle tag */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white uppercase tracking-tight truncate">{pr.exerciseName}</p>
            <span className={`inline-flex items-center text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border mt-0.5 ${muscleColour(pr.muscleGroup)}`}>
              {pr.muscleGroup}
            </span>
          </div>

          {/* e1RM */}
          <div className="w-16 text-right">
            {pr.best1RM !== null ? (
              <span className="text-sm font-black text-[#CCFF00] tracking-tight">
                {Math.round(pr.best1RM)}
                <span className="text-[9px] text-[#CCFF00]/50 ml-0.5">kg</span>
              </span>
            ) : (
              <span className="text-xs text-[#334155]">—</span>
            )}
          </div>

          {/* Best set */}
          <div className="w-20 text-right">
            {pr.bestWeight !== null ? (
              <span className="text-[11px] font-black text-[#adb4ce]">
                {pr.bestWeight}kg
                {pr.bestWeightReps !== null && (
                  <span className="text-[#4a5568]"> ×{pr.bestWeightReps}</span>
                )}
              </span>
            ) : (
              <span className="text-xs text-[#334155]">—</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
