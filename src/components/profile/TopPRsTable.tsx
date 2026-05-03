import Link from 'next/link'
import { Trophy } from 'lucide-react'
import type { TopPR } from '@/lib/data/stats'

interface TopPRsTableProps {
  prs: TopPR[]
}

// Group label colour per muscle group — kept distinct for quick scanning
const MUSCLE_COLOURS: Record<string, string> = {
  chest:      'bg-blue-500/10   text-blue-400   border-blue-500/20',
  back:       'bg-purple-500/10 text-purple-400 border-purple-500/20',
  legs:       'bg-green-500/10  text-green-400  border-green-500/20',
  shoulders:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  arms:       'bg-pink-500/10   text-pink-400   border-pink-500/20',
  core:       'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
}

function muscleColour(group: string): string {
  return MUSCLE_COLOURS[group.toLowerCase()] ?? ''
}

export function TopPRsTable({ prs }: TopPRsTableProps) {
  if (prs.length === 0) {
    return (
      <div className="glass p-6 text-center">
        <Trophy className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
        <p className="text-sm font-semibold uppercase tracking-tight" style={{ color: 'var(--text-faint)' }}>
          No PRs yet
        </p>
        <p className="t-caption mt-1">Complete a few sets to start setting records.</p>
      </div>
    )
  }

  return (
    <div className="glass overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--glass-border)' }}
      >
        <span className="w-5 shrink-0" />
        <span className="flex-1 text-[9px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
          Exercise
        </span>
        <span className="w-16 text-right text-[9px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
          e1RM
        </span>
        <span className="w-20 text-right text-[9px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
          Best Set
        </span>
      </div>

      {/* Rows */}
      {prs.map((pr, idx) => (
        <Link
          key={pr.exerciseId}
          href={`/exercises/${pr.exerciseId}`}
          className="flex items-center gap-2 px-4 py-3 transition-colors active:bg-white/[0.03] hover:bg-white/[0.02]"
          style={{ borderBottom: idx < prs.length - 1 ? '1px solid var(--glass-border)' : undefined }}
        >
          {/* Rank badge */}
          <div
            className="w-5 h-5 shrink-0 rounded flex items-center justify-center text-[9px] font-semibold"
            style={idx === 0
              ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
              : { color: 'var(--text-faint)' }
            }
          >
            {idx === 0 ? <Trophy className="w-3 h-3" /> : idx + 1}
          </div>

          {/* Name + muscle tag */}
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-semibold uppercase tracking-tight truncate"
              style={{ color: 'var(--text-hi)' }}
            >
              {pr.exerciseName}
            </p>
            <span className={`inline-flex items-center text-[8px] font-medium uppercase tracking-widest px-1.5 py-0.5 rounded border mt-0.5 ${muscleColour(pr.muscleGroup)}`}
              style={!muscleColour(pr.muscleGroup)
                ? { background: 'rgba(255,255,255,0.04)', color: 'var(--text-mid)', borderColor: 'var(--glass-border)' }
                : {}
              }
            >
              {pr.muscleGroup}
            </span>
          </div>

          {/* e1RM */}
          <div className="w-16 text-right">
            {pr.best1RM !== null ? (
              <span className="mono text-sm tracking-tight" style={{ color: 'var(--accent)' }}>
                {Math.round(pr.best1RM)}
                <span className="text-[9px] ml-0.5" style={{ color: 'var(--accent-line)' }}>kg</span>
              </span>
            ) : (
              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>—</span>
            )}
          </div>

          {/* Best set */}
          <div className="w-20 text-right">
            {pr.bestWeight !== null ? (
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-mid)' }}>
                {pr.bestWeight}kg
                {pr.bestWeightReps !== null && (
                  <span style={{ color: 'var(--text-faint)' }}> ×{pr.bestWeightReps}</span>
                )}
              </span>
            ) : (
              <span className="text-xs" style={{ color: 'var(--text-faint)' }}>—</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
