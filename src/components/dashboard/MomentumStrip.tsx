import {
  Trophy, Flame, Award, Dumbbell,
  Zap, Shield, BarChart2, Target, TrendingUp, Crown,
  type LucideIcon,
} from 'lucide-react'
import type { RecentPR, TrainingStreak } from '@/lib/data/insights'
import type { Badge } from '@/lib/data/achievements'

interface MomentumStripProps {
  prs:         RecentPR[]
  streak:      TrainingStreak
  badges:      Badge[]
  totalVolume: number
}

const BADGE_ICON_MAP: Record<string, LucideIcon> = {
  'dumbbell':    Dumbbell,
  'zap':         Zap,
  'shield':      Shield,
  'bar-chart-2': BarChart2,
  'trophy':      Trophy,
  'crown':       Crown,
  'target':      Target,
  'trending-up': TrendingUp,
  'flame':       Flame,
}

const MILESTONES = [
  { threshold: 1_000,     label: '1k'   },
  { threshold: 5_000,     label: '5k'   },
  { threshold: 10_000,    label: '10k'  },
  { threshold: 25_000,    label: '25k'  },
  { threshold: 50_000,    label: '50k'  },
  { threshold: 100_000,   label: '100k' },
  { threshold: 250_000,   label: '250k' },
  { threshold: 500_000,   label: '500k' },
  { threshold: 1_000_000, label: '1M'   },
] as const

function formatVolume(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}M`
  if (kg >= 1_000)     return `${(kg / 1_000).toFixed(1)}k`
  return String(Math.round(kg))
}

export function MomentumStrip({ prs, streak, badges, totalVolume }: MomentumStripProps) {
  const { currentStreak, longestStreak } = streak
  const earned      = badges.filter(b => b.earned)
  const recentBadges = earned.slice(-4)
  const latestPR    = prs[0]
  const hasStreak   = currentStreak > 0

  const next     = MILESTONES.find(m => totalVolume < m.threshold)
  const previous = [...MILESTONES].reverse().find(m => totalVolume >= m.threshold)
  const progressPct = next
    ? previous
      ? Math.min(100, Math.round(((totalVolume - previous.threshold) / (next.threshold - previous.threshold)) * 100))
      : Math.min(100, Math.round((totalVolume / next.threshold) * 100))
    : 100

  const streakSubtext =
    longestStreak > currentStreak
      ? `Best ever ${longestStreak}w`
      : currentStreak > 0
      ? 'Personal best streak'
      : 'Start one this week'

  const DOTS = 10
  const dots = Array.from({ length: DOTS }, (_, i) => i < currentStreak)

  return (
    <div className="flex gap-4 overflow-x-auto snap-x no-scrollbar -mx-5 px-5 pb-2">
      
      {/* ── CARD 1: STREAK ── */}
      <div
        className="w-[280px] shrink-0 glass snap-center p-4 flex flex-col justify-between min-h-[145px]"
        style={hasStreak ? {
          borderColor: 'var(--accent-line)',
          background:  'linear-gradient(150deg, rgba(247,37,133,0.06) 0%, rgba(247,37,133,0.01) 50%, transparent 100%)',
        } : undefined}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="t-label">Consistency Streak</span>
          <Flame
            className="w-4 h-4"
            style={{
              color:  hasStreak ? 'var(--accent)' : 'var(--text-faint)',
              filter: hasStreak ? 'drop-shadow(0 0 8px var(--accent-glow))' : 'none',
            }}
          />
        </div>
        <div className="flex items-end justify-between mt-1">
          <div>
            <p
              className="mono font-bold tracking-tighter tabular-nums leading-none"
              style={{
                fontSize:   '2.75rem',
                color:      'var(--text-hi)',
                textShadow: hasStreak ? '0 0 30px var(--accent-glow)' : 'none',
              }}
            >
              {currentStreak}
              <span className="text-sm font-normal ml-1" style={{ color: 'var(--text-faint)', textShadow: 'none' }}>
                {currentStreak === 1 ? 'wk' : 'wks'}
              </span>
            </p>
            <p className="text-[9px] mt-1 text-[var(--text-faint)]">
              {streakSubtext}
            </p>
          </div>

          <div className="flex flex-col gap-1 items-end shrink-0 mb-1">
            {[0, 5].map(offset => (
              <div key={offset} className="flex gap-1">
                {Array.from({ length: 5 }, (_, i) => {
                  const active = dots[offset + i]
                  return (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: active ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                        boxShadow:  active ? '0 0 6px var(--accent-glow)' : 'none',
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CARD 2: PERSONAL RECORDS ── */}
      <div className="w-[240px] shrink-0 glass snap-center p-4 flex flex-col justify-between min-h-[145px]">
        <div className="flex items-center justify-between mb-2">
          <span className="t-label">Personal Records</span>
          <Trophy className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="mt-1">
          <p
            className="mono text-4xl font-bold tabular-nums tracking-tighter leading-none mb-1.5"
            style={{
              color:      'var(--text-hi)',
              textShadow: prs.length > 0 ? '0 0 20px var(--accent-glow)' : 'none',
            }}
          >
            {prs.length}
            <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-faint)', textShadow: 'none' }}>
              in 60d
            </span>
          </p>
          <p
            className="text-[9px] truncate mt-1 font-medium"
            style={{ color: latestPR ? 'var(--accent)' : 'var(--text-faint)' }}
          >
            {latestPR ? `Latest: ${latestPR.exerciseName.toLowerCase()}` : 'Keep chasing gains'}
          </p>
        </div>
      </div>

      {/* ── CARD 3: ACHIEVEMENTS CABINET ── */}
      <div className="w-[240px] shrink-0 glass snap-center p-4 flex flex-col justify-between min-h-[145px]">
        <div className="flex items-center justify-between mb-2">
          <span className="t-label">Achievements</span>
          <Award className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="mt-1">
          <p className="mono text-4xl font-bold tabular-nums tracking-tighter leading-none mb-2" style={{ color: 'var(--text-hi)' }}>
            {earned.length}
            <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-faint)' }}>
              / {badges.length}
            </span>
          </p>
          {recentBadges.length > 0 ? (
            <div className="flex gap-1.5 items-center mt-1.5">
              {recentBadges.map(b => {
                const Icon = BADGE_ICON_MAP[b.icon] ?? Award
                return (
                  <span
                    key={b.id}
                    title={b.label}
                    style={{ filter: `drop-shadow(0 0 4px ${b.color}70)` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: b.color }} />
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="text-[9px] text-[var(--text-faint)] mt-1">
              {badges.length - earned.length} more to unlock
            </p>
          )}
        </div>
      </div>

      {/* ── CARD 4: LIFETIME TONNAGE ── */}
      <div className="w-[260px] shrink-0 glass snap-center p-4 flex flex-col justify-between min-h-[145px]">
        <div className="flex items-center justify-between mb-2">
          <span className="t-label">Lifetime Tonnage</span>
          <Dumbbell className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="mt-1">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[9px] mono tabular-nums text-[var(--text-faint)]">
              {previous ? previous.label : '0'} Club
            </span>
            <p className="mono text-2xl font-bold tabular-nums tracking-tighter leading-none text-[var(--text-hi)]">
              {formatVolume(totalVolume)}
              <span className="text-xs font-normal ml-0.5 text-[var(--text-faint)]">kg</span>
            </p>
          </div>

          <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.06] mb-1">
            <div
              className="h-full rounded-full"
              style={{
                width:      `${progressPct}%`,
                background: 'var(--accent)',
                boxShadow:  '0 0 8px var(--accent-glow)',
              }}
            />
          </div>

          <div className="text-[8px] text-[var(--text-faint)] flex justify-between">
            <span>{progressPct}% complete</span>
            <span>{next ? `Next: ${next.label}` : 'Max milestone reached'}</span>
          </div>
        </div>
      </div>

    </div>
  )
}
