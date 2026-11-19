import { Flame, Clock, Calendar, TrendingUp } from 'lucide-react'
import { formatVolume } from '@/lib/load'

interface OverviewStatsRowProps {
  currentStreak:    number
  longestStreak:    number
  trainingAgeWeeks: number
  /** Days since the most recent workout. null = no workouts yet. */
  daysSinceLastSession: number | null
  /** Lifetime volume lifted, in kg. */
  totalVolumeKg: number
}

interface StatCellProps {
  icon:     React.ReactNode
  label:    string
  value:    string
  sub?:     string
}

// formatVolume tops out at "k"; lifetime totals routinely pass a million.
function formatLifetimeVolume(kg: number): string {
  return kg >= 1_000_000 ? `${(kg / 1_000_000).toFixed(2)}M` : formatVolume(kg)
}

function StatCell({ icon, label, value, sub }: StatCellProps) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div
        className="w-8 h-8 rounded-[var(--radius-inner)] flex items-center justify-center mb-0.5"
        style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}
      >
        {icon}
      </div>
      <span className="t-label text-center">{label}</span>
      <span
        className="mono text-lg font-semibold leading-none"
        style={{ color: 'var(--text-hi)' }}
      >
        {value}
      </span>
      {sub && (
        <span className="t-caption text-center">{sub}</span>
      )}
    </div>
  )
}

export function OverviewStatsRow({
  currentStreak,
  longestStreak,
  trainingAgeWeeks,
  daysSinceLastSession,
  totalVolumeKg,
}: OverviewStatsRowProps) {
  const trainingAgeLabel =
    trainingAgeWeeks >= 52
      ? `${Math.floor(trainingAgeWeeks / 52)}y ${trainingAgeWeeks % 52}w`
      : `${trainingAgeWeeks}w`

  const lastSessionLabel =
    daysSinceLastSession === null ? '—'
    : daysSinceLastSession === 0  ? 'Today'
    : daysSinceLastSession === 1  ? '1 day'
    : `${daysSinceLastSession}d`

  const streakSub = longestStreak > currentStreak
    ? `Best: ${longestStreak}w`
    : currentStreak > 0
    ? 'Personal best!'
    : undefined

  return (
    <div
      className="glass p-4 flex items-start gap-2"
      style={{ borderColor: 'var(--accent-line)' }}
    >
      <StatCell
        icon={<Flame className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
        label="Streak"
        value={currentStreak > 0 ? `${currentStreak}w` : '—'}
        sub={streakSub}
      />
      <div className="w-px self-stretch" style={{ background: 'var(--border)' }} />
      <StatCell
        icon={<Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
        label="Last Session"
        value={lastSessionLabel}
      />
      <div className="w-px self-stretch" style={{ background: 'var(--border)' }} />
      <StatCell
        icon={<Calendar className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
        label="Training Age"
        value={trainingAgeWeeks > 0 ? trainingAgeLabel : '—'}
      />
      <div className="w-px self-stretch" style={{ background: 'var(--border)' }} />
      <StatCell
        icon={<TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
        label="Lifetime"
        value={`${formatLifetimeVolume(totalVolumeKg)} kg`}
      />
    </div>
  )
}
