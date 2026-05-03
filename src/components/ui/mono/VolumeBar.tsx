import { cn } from '@/lib/utils'

export type VolumeStatus = 'under' | 'building' | 'optimal' | 'over'

interface VolumeBarProps {
  muscle: string
  sets: number
  mev: number
  mav: number
  mrv: number
  className?: string
}

const statusFor = (sets: number, mev: number, mav: number, mrv: number): VolumeStatus => {
  if (sets >= mrv) return 'over'
  if (sets >= mav) return 'optimal'
  if (sets >= mev) return 'building'
  return 'under'
}

const colorFor: Record<VolumeStatus, string> = {
  over:     'var(--rose)',
  optimal:  'var(--accent)',
  building: 'var(--teal)',
  under:    'var(--text-low)',
}

/**
 * MEV · MAV · MRV volume bar. Shows weekly working sets vs landmarks.
 * Tick marks at MEV/MAV, fill colored by zone.
 */
export function VolumeBar({ muscle, sets, mev, mav, mrv, className }: VolumeBarProps) {
  const status = statusFor(sets, mev, mav, mrv)
  const color = colorFor[status]
  const pct = Math.min(100, (sets / mrv) * 100)
  const mevPct = (mev / mrv) * 100
  const mavPct = (mav / mrv) * 100

  return (
    <div className={className}>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-[var(--text-mid)]">{muscle}</span>
        <span className="mono" style={{ color }}>
          {sets} sets · {status}
        </span>
      </div>
      <div className="relative h-[5px] bg-white/[0.05] rounded-[3px] overflow-hidden">
        <div className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${mevPct}%` }} />
        <div className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: `${mavPct}%` }} />
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </div>
    </div>
  )
}
