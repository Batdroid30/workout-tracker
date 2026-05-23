interface PushPullLegsCardProps {
  pushSets: number
  pullSets: number
  legSets:  number
}

interface BalanceRowProps {
  label:   string
  sets:    number
  total:   number
  color:   string
}

function BalanceRow({ label, sets, total, color }: BalanceRowProps) {
  const pct = total > 0 ? Math.round((sets / total) * 100) : 0
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[12px] font-medium" style={{ color: 'var(--text-hi)' }}>{label}</span>
        <span className="mono text-[11px]" style={{ color: 'var(--text-lo)' }}>
          {sets} sets ({pct}%)
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--surface-2)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export function PushPullLegsCard({ pushSets, pullSets, legSets }: PushPullLegsCardProps) {
  const total = pushSets + pullSets + legSets

  if (total === 0) return null

  // Push:pull ratio verdict
  const ratio  = pullSets > 0 ? pushSets / pullSets : null
  let ratioLabel: string
  let ratioColor: string
  if (ratio === null) {
    ratioLabel = 'No pull data'
    ratioColor = 'var(--text-lo)'
  } else if (ratio < 0.75) {
    ratioLabel = 'Pull-heavy'
    ratioColor = 'var(--text-lo)'
  } else if (ratio > 1.35) {
    ratioLabel = 'Push-heavy — add rows'
    ratioColor = 'var(--error, #f87171)'
  } else {
    ratioLabel = 'Balanced'
    ratioColor = 'var(--accent)'
  }

  return (
    <div className="glass p-4">
      <div className="flex items-baseline justify-between mb-4">
        <div className="t-label">Push / Pull / Legs</div>
        <span className="text-[11px] font-medium" style={{ color: ratioColor }}>
          {ratioLabel}
        </span>
      </div>

      <div className="space-y-3">
        <BalanceRow
          label="Push"
          sets={pushSets}
          total={total}
          color="color-mix(in srgb, var(--accent) 85%, #60a5fa)"
        />
        <BalanceRow
          label="Pull"
          sets={pullSets}
          total={total}
          color="var(--accent)"
        />
        <BalanceRow
          label="Legs"
          sets={legSets}
          total={total}
          color="color-mix(in srgb, var(--accent) 60%, #a78bfa)"
        />
      </div>

      <p className="t-caption mt-3">
        Over the last 12 weeks · {total} total working sets
      </p>
    </div>
  )
}
