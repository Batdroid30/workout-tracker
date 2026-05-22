import { Trophy, TrendingUp, TrendingDown, Dumbbell } from 'lucide-react'
import type { ReactNode } from 'react'

interface QuickStatsRowProps {
  prCount:         number
  volumeChangePct: number | null
  totalWorkouts:   number
  totalVolume:     number
}

function formatVolume(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}M`
  if (kg >= 1_000)     return `${(kg / 1_000).toFixed(1)}k`
  return String(kg)
}

export function QuickStatsRow({
  prCount,
  volumeChangePct,
  totalWorkouts,
  totalVolume,
}: QuickStatsRowProps) {
  const volUp = volumeChangePct !== null && volumeChangePct > 0
  const volDown = volumeChangePct !== null && volumeChangePct < 0

  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-5 px-5 mb-5">
      <StatChip
        label="PRs"
        icon={<Trophy className="w-3 h-3" />}
        value={String(prCount)}
        sub="in 60 days"
        glowAccent={prCount > 0}
      />

      <StatChip
        label="Volume"
        icon={
          volDown
            ? <TrendingDown className="w-3 h-3" />
            : <TrendingUp className="w-3 h-3" />
        }
        value={
          volumeChangePct !== null
            ? `${volumeChangePct > 0 ? '+' : ''}${volumeChangePct}%`
            : '—'
        }
        sub="vs last week"
        valueColor={
          volUp   ? 'var(--teal)' :
          volDown ? 'var(--rose)' :
          undefined
        }
      />

      <StatChip
        label="Sessions"
        icon={<Dumbbell className="w-3 h-3" />}
        value={String(totalWorkouts)}
        sub="all time"
      />

      <StatChip
        label="Tonnage"
        icon={<Dumbbell className="w-3 h-3" />}
        value={formatVolume(totalVolume)}
        sub="kg lifetime"
      />
    </div>
  )
}

interface StatChipProps {
  label:      string
  icon:       ReactNode
  value:      string
  sub:        string
  glowAccent?: boolean
  valueColor?: string
}

function StatChip({ label, icon, value, sub, glowAccent, valueColor }: StatChipProps) {
  return (
    <div
      className="shrink-0 glass p-3.5 min-w-[112px]"
      style={glowAccent ? { borderColor: 'var(--accent-line)' } : undefined}
    >
      <div
        className="flex items-center gap-1.5 mb-2"
        style={{ color: 'var(--text-low)' }}
      >
        {icon}
        <span className="t-label">{label}</span>
      </div>
      <p
        className="mono text-2xl font-semibold tabular-nums leading-none"
        style={{
          color: valueColor ?? 'var(--text-hi)',
          textShadow: glowAccent ? '0 0 20px var(--accent-glow)' : 'none',
        }}
      >
        {value}
      </p>
      <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>
        {sub}
      </p>
    </div>
  )
}
