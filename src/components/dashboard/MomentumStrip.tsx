import { Trophy, Flame, Award, Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecentPR, TrainingStreak } from '@/lib/data/insights'
import type { Badge } from '@/lib/data/achievements'

interface MomentumStripProps {
  prs:         RecentPR[]
  streak:      TrainingStreak
  badges:      Badge[]
  totalVolume: number
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
    <Tile label="Recent PRs" icon={<Trophy className="w-3 h-3 text-[var(--accent)]" />} positive={prs.length > 0}>
      <p className="mono text-3xl font-medium text-[var(--text-hi)] tracking-tighter tabular-nums">
        {prs.length}
        <span className="text-xs text-[var(--text-low)] ml-1.5">in 60d</span>
      </p>
      <p className="text-[10px] text-[var(--text-low)] mt-1 truncate">
        {latest ? `Latest: ${latest.exerciseName.toLowerCase()}` : 'No PRs yet — go set one'}
      </p>
    </Tile>
  )
}

function StreakTile({ streak }: { streak: TrainingStreak }) {
  const { currentStreak, longestStreak } = streak
  const dots = Array.from({ length: 8 }, (_, i) => i < currentStreak)
  return (
    <Tile label="Streak" icon={<Flame className="w-3 h-3 text-[var(--accent)]" />} positive={currentStreak >= 4}>
      <p className="mono text-3xl font-medium text-[var(--text-hi)] tracking-tighter tabular-nums">
        {currentStreak}
        <span className="text-xs text-[var(--text-low)] ml-1">{currentStreak === 1 ? 'wk' : 'wks'}</span>
      </p>
      <div className="flex gap-0.5 mt-2">
        {dots.map((active, i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full', active ? 'bg-[var(--accent)]' : 'bg-white/[0.06]')}
            style={active ? { boxShadow: '0 0 4px var(--accent-glow)' } : undefined} />
        ))}
      </div>
      <p className="text-[10px] text-[var(--text-low)] mt-1 truncate">
        {longestStreak > currentStreak ? `Best ever ${longestStreak}w` :
         currentStreak > 0 ? 'New personal best' : 'Start one this week'}
      </p>
    </Tile>
  )
}

function BadgesTile({ badges }: { badges: Badge[] }) {
  const earned = badges.filter(b => b.earned)
  const total  = badges.length
  const recent = earned.slice(-3)
  return (
    <Tile label="Achievements" icon={<Award className="w-3 h-3 text-[var(--accent)]" />} positive={earned.length > 0}>
      <p className="mono text-3xl font-medium text-[var(--text-hi)] tracking-tighter tabular-nums">
        {earned.length}
        <span className="text-xs text-[var(--text-low)] ml-1">/ {total}</span>
      </p>
      <div className="flex gap-1 mt-2 min-h-[18px]">
        {recent.length > 0 ? (
          recent.map(b => <span key={b.id} title={b.label} className="text-base leading-none">{b.emoji}</span>)
        ) : (
          <span className="text-[10px] text-[var(--text-faint)]">None unlocked yet</span>
        )}
      </div>
      <p className="text-[10px] text-[var(--text-low)] mt-1 truncate">
        {earned.length === 0 ? 'Complete a workout' : `${total - earned.length} more to unlock`}
      </p>
    </Tile>
  )
}

const MILESTONES = [
  { threshold: 1_000, label: '1k' }, { threshold: 5_000, label: '5k' },
  { threshold: 10_000, label: '10k' }, { threshold: 25_000, label: '25k' },
  { threshold: 50_000, label: '50k' }, { threshold: 100_000, label: '100k' },
  { threshold: 250_000, label: '250k' }, { threshold: 500_000, label: '500k' },
  { threshold: 1_000_000, label: '1M' },
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
      ? Math.min(100, Math.round(((totalVolume - previous.threshold) / (next.threshold - previous.threshold)) * 100))
      : Math.min(100, Math.round((totalVolume / next.threshold) * 100))
    : 100
  return (
    <Tile label="Lifetime" icon={<Dumbbell className="w-3 h-3 text-[var(--accent)]" />} positive={false}>
      <p className="mono text-3xl font-medium text-[var(--text-hi)] tracking-tighter tabular-nums">
        {formatVolume(totalVolume)}
        <span className="text-xs text-[var(--text-low)] ml-1">kg</span>
      </p>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mt-2">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progressPct}%`, boxShadow: '0 0 6px var(--accent-glow)' }} />
      </div>
      <p className="text-[10px] text-[var(--text-low)] mt-1 truncate">
        {next ? `Next: ${next.label} Club` : 'All milestones reached'}
      </p>
    </Tile>
  )
}

function Tile({ label, icon, positive, children }: { label: string; icon: React.ReactNode; positive: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('glass p-3', positive && 'border-[var(--accent-line)]')}>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="t-label">{label}</p>
      </div>
      {children}
    </div>
  )
}
