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
    <div
      className="glass p-4"
      style={hasStreak ? {
        borderColor: 'var(--accent-line)',
        background:  'linear-gradient(150deg, rgba(247,37,133,0.06) 0%, rgba(247,37,133,0.01) 50%, transparent 100%)',
      } : undefined}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-5">
        <Flame
          className="w-4 h-4"
          style={{
            color:  hasStreak ? 'var(--accent)' : 'var(--text-faint)',
            filter: hasStreak ? 'drop-shadow(0 0 8px var(--accent-glow))' : 'none',
          }}
        />
        <h2 className="t-display-s">Momentum</h2>
      </div>

      {/* ── Streak hero ── */}
      <div className="mb-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="t-label mb-1">Streak</p>
            <p
              className="mono font-bold tracking-tighter tabular-nums leading-none"
              style={{
                fontSize:   '3.5rem',
                color:      'var(--text-hi)',
                textShadow: hasStreak ? '0 0 40px var(--accent-glow)' : 'none',
              }}
            >
              {currentStreak}
              <span
                className="text-lg font-normal ml-2"
                style={{ color: 'var(--text-faint)', textShadow: 'none' }}
              >
                {currentStreak === 1 ? 'wk' : 'wks'}
              </span>
            </p>
            <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-faint)' }}>
              {streakSubtext}
            </p>
          </div>

          {/* Dot grid: 2 rows of 5 */}
          <div className="flex flex-col gap-1.5 items-end shrink-0">
            {[0, 5].map(offset => (
              <div key={offset} className="flex gap-1.5">
                {Array.from({ length: 5 }, (_, i) => {
                  const active = dots[offset + i]
                  return (
                    <div
                      key={i}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        background: active ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                        boxShadow:  active ? '0 0 8px var(--accent-glow)' : 'none',
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div
        className="grid grid-cols-2 gap-0 mb-5 rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* PRs */}
        <div className="p-3.5" style={{ borderRight: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="w-3 h-3" style={{ color: 'var(--accent)' }} />
            <span className="t-label">Recent PRs</span>
          </div>
          <p
            className="mono text-3xl font-bold tabular-nums tracking-tighter leading-none mb-1"
            style={{
              color:      'var(--text-hi)',
              textShadow: prs.length > 0 ? '0 0 24px var(--accent-glow)' : 'none',
            }}
          >
            {prs.length}
            <span className="text-xs font-normal ml-1.5" style={{ color: 'var(--text-faint)', textShadow: 'none' }}>
              in 60d
            </span>
          </p>
          <p
            className="text-[10px] truncate"
            style={{ color: latestPR ? 'var(--accent)' : 'var(--text-faint)' }}
          >
            {latestPR ? latestPR.exerciseName.toLowerCase() : 'No PRs yet'}
          </p>
        </div>

        {/* Badges */}
        <div className="p-3.5" style={{ background: 'rgba(255,255,255,0.015)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Award className="w-3 h-3" style={{ color: 'var(--accent)' }} />
            <span className="t-label">Achievements</span>
          </div>
          <p className="mono text-3xl font-bold tabular-nums tracking-tighter leading-none mb-1" style={{ color: 'var(--text-hi)' }}>
            {earned.length}
            <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-faint)' }}>
              / {badges.length}
            </span>
          </p>
          {recentBadges.length > 0 ? (
            <div className="flex gap-2 items-center">
              {recentBadges.map(b => {
                const Icon = BADGE_ICON_MAP[b.icon] ?? Award
                return (
                  <span
                    key={b.id}
                    title={b.label}
                    style={{ filter: `drop-shadow(0 0 5px ${b.color}90)` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: b.color }} />
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
              {badges.length - earned.length} to unlock
            </p>
          )}
        </div>
      </div>

      {/* ── Lifetime tonnage ── */}
      <div>
        <div className="flex items-end justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Dumbbell className="w-3 h-3" style={{ color: 'var(--accent)' }} />
            <span className="t-label">Lifetime</span>
          </div>
          <p
            className="mono text-2xl font-bold tabular-nums tracking-tighter leading-none"
            style={{ color: 'var(--text-hi)' }}
          >
            {formatVolume(totalVolume)}
            <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-faint)' }}>kg</span>
          </p>
        </div>

        <div
          className="h-2 rounded-full overflow-hidden mb-1.5"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width:      `${progressPct}%`,
              background: 'var(--accent)',
              boxShadow:  '0 0 10px var(--accent-glow)',
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[9px] mono tabular-nums" style={{ color: 'var(--text-faint)' }}>
            {previous ? previous.label : '0'} Club
          </p>
          <p className="text-[9px]" style={{ color: 'var(--text-faint)' }}>
            {next
              ? `${progressPct}% → ${next.label} Club`
              : 'All milestones reached'}
          </p>
        </div>
      </div>
    </div>
  )
}
