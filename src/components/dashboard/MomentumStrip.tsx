import {
  Trophy, Flame, Award, Dumbbell,
  Zap, Shield, BarChart2, Target, TrendingUp, Crown,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
        className={cn(
          'w-[280px] shrink-0 card snap-center p-4 flex flex-col justify-between min-h-[145px]',
          hasStreak && 'border-border-strong',
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="t-label">Consistency streak</span>
          <Flame className={cn('w-4 h-4', hasStreak ? 'text-primary' : 'text-tertiary')} />
        </div>
        <div className="flex items-end justify-between mt-1">
          <div>
            <p
              className="mono font-bold tracking-tighter tabular-nums leading-none text-primary"
              style={{ fontSize: '2.75rem' }}
            >
              {currentStreak}
              <span className="text-sm font-normal ml-1 text-tertiary">
                {currentStreak === 1 ? 'wk' : 'wks'}
              </span>
            </p>
            <p className="text-xs mt-1 text-tertiary">
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
                      className={cn('w-2 h-2 rounded-full', active ? 'bg-primary' : 'bg-surface-raised')}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CARD 2: PERSONAL RECORDS ── */}
      <div className="w-[240px] shrink-0 card snap-center p-4 flex flex-col justify-between min-h-[145px]">
        <div className="flex items-center justify-between mb-2">
          <span className="t-label">Personal records</span>
          <Trophy className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="mt-1">
          <p className="mono text-4xl font-bold tabular-nums tracking-tighter leading-none mb-1.5 text-primary">
            {prs.length}
            <span className="text-xs font-normal ml-1 text-tertiary">
              in 60d
            </span>
          </p>
          <p className={cn('text-xs truncate mt-1 font-medium', latestPR ? 'text-primary' : 'text-tertiary')}>
            {latestPR ? `Latest: ${latestPR.exerciseName.toLowerCase()}` : 'Keep chasing gains'}
          </p>
        </div>
      </div>

      {/* ── CARD 3: ACHIEVEMENTS CABINET ── */}
      <div className="w-[240px] shrink-0 card snap-center p-4 flex flex-col justify-between min-h-[145px]">
        <div className="flex items-center justify-between mb-2">
          <span className="t-label">Achievements</span>
          <Award className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="mt-1">
          <p className="mono text-4xl font-bold tabular-nums tracking-tighter leading-none mb-2 text-primary">
            {earned.length}
            <span className="text-xs font-normal ml-1 text-tertiary">
              / {badges.length}
            </span>
          </p>
          {recentBadges.length > 0 ? (
            <div className="flex gap-1.5 items-center mt-1.5">
              {recentBadges.map(b => {
                const Icon = BADGE_ICON_MAP[b.icon] ?? Award
                return (
                  <span key={b.id} title={b.label}>
                    <Icon className="w-3.5 h-3.5" style={{ color: b.color }} />
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-tertiary mt-1">
              {badges.length - earned.length} more to unlock
            </p>
          )}
        </div>
      </div>

      {/* ── CARD 4: LIFETIME TONNAGE ── */}
      <div className="w-[260px] shrink-0 card snap-center p-4 flex flex-col justify-between min-h-[145px]">
        <div className="flex items-center justify-between mb-2">
          <span className="t-label">Lifetime tonnage</span>
          <Dumbbell className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="mt-1">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs mono tabular-nums text-tertiary">
              {previous ? previous.label : '0'} Club
            </span>
            <p className="mono text-2xl font-bold tabular-nums tracking-tighter leading-none text-primary">
              {formatVolume(totalVolume)}
              <span className="text-xs font-normal ml-0.5 text-tertiary">kg</span>
            </p>
          </div>

          <div className="h-1.5 rounded-full overflow-hidden bg-surface-raised mb-1">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="text-xs text-tertiary flex justify-between">
            <span>{progressPct}% complete</span>
            <span>{next ? `Next: ${next.label}` : 'Max milestone reached'}</span>
          </div>
        </div>
      </div>

    </div>
  )
}
