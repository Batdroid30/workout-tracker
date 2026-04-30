import { Trophy, Flame, Award, Dumbbell } from 'lucide-react'
import type { RecentPR, TrainingStreak } from '@/lib/data/insights'
import type { Badge } from '@/lib/data/achievements'

// ─── Momentum strip — compact 2x2 dopamine layer ─────────────────────────────
//
// Folds the four reward cards (RecentPRs, TrainingStreak, Badges, Lifetime
// Tonnage) into a single 2x2 grid of tiles. Each tile shows the headline
// number and one supporting line — enough to feel rewarded without scrolling
// past 4 separate cards' worth of detail.

interface MomentumStripProps {
  prs:         RecentPR[]
  streak:      TrainingStreak
  badges:      Badge[]
  totalVolume: number
}

export function MomentumStrip({ prs, streak, badges, totalVolume }: MomentumStripProps) {
  return (
    <div>
      <h2 className="text-[10px] font-black tracking-[0.2em] uppercase text-[#4a5568] mb-3">
        Momentum
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <PRsTile prs={prs} />
        <StreakTile streak={streak} />
        <BadgesTile badges={badges} />
        <TonnageTile totalVolume={totalVolume} />
      </div>
    </div>
  )
}

// ── PRs tile — last 60 days ──────────────────────────────────────────────────

function PRsTile({ prs }: { prs: RecentPR[] }) {
  const latest = prs[0]
  return (
    <Tile
      label="Recent PRs"
      icon={<Trophy className="w-3 h-3 text-[#CCFF00]" />}
      accent="positive"
    >
      <p className="text-3xl font-black text-white tracking-tighter tabular-nums">
        {prs.length}
        <span className="text-xs text-[#4a5568] ml-1.5 font-bold">in 60d</span>
      </p>
      <p className="text-[10px] text-[#4a5568] font-body mt-1 truncate">
        {latest
          ? `Latest: ${latest.exerciseName.toLowerCase()}`
          : 'No PRs yet — go set one'}
      </p>
    </Tile>
  )
}

// ── Streak tile ──────────────────────────────────────────────────────────────

function StreakTile({ streak }: { streak: TrainingStreak }) {
  const { currentStreak, longestStreak } = streak
  const dots = Array.from({ length: 8 }, (_, i) => i < currentStreak)

  return (
    <Tile
      label="Streak"
      icon={<Flame className="w-3 h-3 text-[#CCFF00]" />}
      accent={currentStreak >= 4 ? 'positive' : 'neutral'}
    >
      <p className="text-3xl font-black text-white tracking-tighter tabular-nums">
        {currentStreak}
        <span className="text-xs text-[#4a5568] ml-1 font-bold">
          {currentStreak === 1 ? 'wk' : 'wks'}
        </span>
      </p>
      <div className="flex gap-0.5 mt-2">
        {dots.map((active, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${active ? 'bg-[#CCFF00]' : 'bg-[#151b2d]'}`}
          />
        ))}
      </div>
      <p className="text-[10px] text-[#4a5568] font-body mt-1 truncate">
        {longestStreak > currentStreak
          ? `Best ever ${longestStreak}w`
          : currentStreak > 0
            ? 'New personal best'
            : 'Start one this week'}
      </p>
    </Tile>
  )
}

// ── Badges tile ──────────────────────────────────────────────────────────────

function BadgesTile({ badges }: { badges: Badge[] }) {
  const earned = badges.filter(b => b.earned)
  const total  = badges.length
  const recent = earned.slice(-3)

  return (
    <Tile
      label="Achievements"
      icon={<Award className="w-3 h-3 text-[#CCFF00]" />}
      accent={earned.length > 0 ? 'positive' : 'neutral'}
    >
      <p className="text-3xl font-black text-white tracking-tighter tabular-nums">
        {earned.length}
        <span className="text-xs text-[#4a5568] ml-1 font-bold">/ {total}</span>
      </p>
      <div className="flex gap-1 mt-2 min-h-[18px]">
        {recent.length > 0 ? (
          recent.map(b => (
            <span key={b.id} title={b.label} className="text-base leading-none">
              {b.emoji}
            </span>
          ))
        ) : (
          <span className="text-[10px] text-[#334155] font-body">None unlocked yet</span>
        )}
      </div>
      <p className="text-[10px] text-[#4a5568] font-body mt-1 truncate">
        {earned.length === 0
          ? 'Complete a workout'
          : `${total - earned.length} more to unlock`}
      </p>
    </Tile>
  )
}

// ── Lifetime tonnage tile ────────────────────────────────────────────────────

const MILESTONES = [
  { threshold:        1_000, label: '1k'   },
  { threshold:        5_000, label: '5k'   },
  { threshold:       10_000, label: '10k'  },
  { threshold:       25_000, label: '25k'  },
  { threshold:       50_000, label: '50k'  },
  { threshold:      100_000, label: '100k' },
  { threshold:      250_000, label: '250k' },
  { threshold:      500_000, label: '500k' },
  { threshold:    1_000_000, label: '1M'   },
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
    <Tile
      label="Lifetime"
      icon={<Dumbbell className="w-3 h-3 text-[#CCFF00]" />}
      accent="neutral"
    >
      <p className="text-3xl font-black text-white tracking-tighter tabular-nums">
        {formatVolume(totalVolume)}
        <span className="text-xs text-[#4a5568] ml-1 font-bold">kg</span>
      </p>
      <div className="h-1 bg-[#151b2d] rounded-full overflow-hidden mt-2">
        <div className="h-full bg-[#CCFF00] rounded-full" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="text-[10px] text-[#4a5568] font-body mt-1 truncate">
        {next ? `Next: ${next.label} Club` : 'All milestones reached'}
      </p>
    </Tile>
  )
}

// ── Shared tile wrapper ──────────────────────────────────────────────────────

interface TileProps {
  label:    string
  icon:     React.ReactNode
  accent:   'positive' | 'neutral'
  children: React.ReactNode
}

function Tile({ label, icon, accent, children }: TileProps) {
  const border = accent === 'positive' ? 'border-[#CCFF00]/20' : 'border-[#334155]'
  return (
    <div className={`glass-panel rounded-xl p-3 border ${border}`}>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#4a5568]">
          {label}
        </p>
      </div>
      {children}
    </div>
  )
}
