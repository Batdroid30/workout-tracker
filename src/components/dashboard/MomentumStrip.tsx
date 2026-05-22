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

export function MomentumStrip({ prs, streak, badges, totalVolume }: MomentumStripProps) {
  return (
    <div>
      <h2 className="t-display-s mb-3">Momentum</h2>
      <div className="grid grid-cols-2 gap-3">
        <PRsTile prs={prs} />
        <StreakTile streak={streak} />
        <BadgesTile badges={badges} />
        <TonnageTile totalVolume={totalVolume} />
      </div>
    </div>
  )
}

function PRsTile({ prs }: { prs: RecentPR[] }) {
  const latest = prs[0]
  return (
    <Tile
      label="Recent PRs"
      icon={<Trophy className="w-3 h-3" style={{ color: 'var(--accent)' }} />}
      highlight={prs.length > 0}
    >
      <p
        className="mono text-3xl font-bold tracking-tighter tabular-nums"
        style={{
          color: 'var(--text-hi)',
          textShadow: prs.length > 0 ? '0 0 24px var(--accent-glow)' : 'none',
        }}
      >
        {prs.length}
        <span
          className="text-xs font-normal ml-1.5"
          style={{ color: 'var(--text-faint)', textShadow: 'none' }}
        >
          in 60d
        </span>
      </p>
      <p
        className="text-[10px] mt-1.5 truncate"
        style={{ color: latest ? 'var(--accent)' : 'var(--text-faint)' }}
      >
        {latest
          ? latest.exerciseName.toLowerCase()
          : 'No PRs yet — go set one'}
      </p>
    </Tile>
  )
}

function StreakTile({ streak }: { streak: TrainingStreak }) {
  const { currentStreak, longestStreak } = streak
  const dots = Array.from({ length: 8 }, (_, i) => i < currentStreak)
  return (
    <Tile
      label="Streak"
      icon={<Flame className="w-3 h-3" style={{ color: 'var(--accent)' }} />}
      highlight={currentStreak >= 4}
    >
      <p
        className="mono text-3xl font-bold tracking-tighter tabular-nums"
        style={{
          color: 'var(--text-hi)',
          textShadow: currentStreak > 0 ? '0 0 24px var(--accent-glow)' : 'none',
        }}
      >
        {currentStreak}
        <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-faint)', textShadow: 'none' }}>
          {currentStreak === 1 ? 'wk' : 'wks'}
        </span>
      </p>
      <div className="flex gap-0.5 mt-2">
        {dots.map((active, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background: active ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
              boxShadow:  active ? '0 0 6px var(--accent-glow)' : 'none',
            }}
          />
        ))}
      </div>
      <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--text-faint)' }}>
        {longestStreak > currentStreak
          ? `Best ever ${longestStreak}w`
          : currentStreak > 0
          ? 'New personal best'
          : 'Start one this week'}
      </p>
    </Tile>
  )
}

function BadgesTile({ badges }: { badges: Badge[] }) {
  const earned = badges.filter(b => b.earned)
  const recent = earned.slice(-3)
  return (
    <Tile
      label="Achievements"
      icon={<Award className="w-3 h-3" style={{ color: 'var(--accent)' }} />}
      highlight={earned.length > 0}
    >
      <p className="mono text-3xl font-bold tracking-tighter tabular-nums" style={{ color: 'var(--text-hi)' }}>
        {earned.length}
        <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-faint)' }}>
          / {badges.length}
        </span>
      </p>
      <div className="flex gap-2 mt-2 min-h-[20px] items-center">
        {recent.length > 0 ? (
          recent.map(b => {
            const Icon = BADGE_ICON_MAP[b.icon] ?? Award
            return (
              <span
                key={b.id}
                title={b.label}
                style={{ filter: `drop-shadow(0 0 4px ${b.color}80)` }}
              >
                <Icon className="w-4 h-4" style={{ color: b.color }} />
              </span>
            )
          })
        ) : (
          <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
            None unlocked yet
          </span>
        )}
      </div>
      <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--text-faint)' }}>
        {earned.length === 0
          ? 'Complete a workout'
          : `${badges.length - earned.length} more to unlock`}
      </p>
    </Tile>
  )
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
  return String(kg)
}

function TonnageTile({ totalVolume }: { totalVolume: number }) {
  const next     = MILESTONES.find(m => totalVolume < m.threshold)
  const previous = [...MILESTONES].reverse().find(m => totalVolume >= m.threshold)
  const progressPct = next
    ? previous
      ? Math.min(100, Math.round(
          ((totalVolume - previous.threshold) / (next.threshold - previous.threshold)) * 100
        ))
      : Math.min(100, Math.round((totalVolume / next.threshold) * 100))
    : 100

  return (
    <Tile
      label="Lifetime"
      icon={<Dumbbell className="w-3 h-3" style={{ color: 'var(--accent)' }} />}
      highlight={false}
    >
      <p className="mono text-3xl font-bold tracking-tighter tabular-nums" style={{ color: 'var(--text-hi)' }}>
        {formatVolume(totalVolume)}
        <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-faint)' }}>kg</span>
      </p>
      <div
        className="h-1.5 rounded-full overflow-hidden mt-2"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width:     `${progressPct}%`,
            background: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent-glow)',
          }}
        />
      </div>
      <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--text-faint)' }}>
        {next ? `Next: ${next.label} Club` : 'All milestones reached'}
      </p>
    </Tile>
  )
}

function Tile({
  label,
  icon,
  highlight,
  children,
}: {
  label:     string
  icon:      React.ReactNode
  highlight: boolean
  children:  React.ReactNode
}) {
  return (
    <div
      className="glass p-3.5"
      style={highlight ? { borderColor: 'var(--accent-line)' } : undefined}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        {icon}
        <p className="t-label">{label}</p>
      </div>
      {children}
    </div>
  )
}
