// Accumulated sets per muscle across a window — built server-side from snapshot.weeklyData

export interface AntagonistSetCounts {
  chest:      number
  back:       number
  lats:       number
  quads:      number
  hamstrings: number
  biceps:     number
  triceps:    number
}

interface AntagonistBalanceCardProps {
  sets: AntagonistSetCounts
}

interface PairRowProps {
  labelA:  string
  setsA:   number
  labelB:  string
  setsB:   number
}

function PairRow({ labelA, setsA, labelB, setsB }: PairRowProps) {
  const total  = setsA + setsB
  const pctA   = total > 0 ? (setsA / total) * 100 : 50
  const pctB   = 100 - pctA

  const isBalanced = pctA >= 38 && pctA <= 62
  const aHeavy     = pctA > 62
  const barColorA  = aHeavy
    ? 'var(--error, #f87171)'
    : isBalanced
    ? 'var(--accent)'
    : 'color-mix(in srgb, var(--accent) 55%, transparent)'
  const barColorB  = !isBalanced && !aHeavy
    ? 'var(--error, #f87171)'
    : isBalanced
    ? 'var(--accent)'
    : 'color-mix(in srgb, var(--accent) 55%, transparent)'

  return (
    <div>
      {/* Labels + set counts */}
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px]" style={{ color: aHeavy ? 'var(--error, #f87171)' : 'var(--text-hi)' }}>
          {labelA} <span className="text-[10px]" style={{ color: 'var(--text-lo)' }}>({setsA})</span>
        </span>
        <span
          className="text-[10px] font-medium"
          style={{ color: isBalanced ? 'var(--accent)' : 'var(--text-lo)' }}
        >
          {Math.round(pctA)}:{Math.round(pctB)}
        </span>
        <span className="text-[11px]" style={{ color: !isBalanced && !aHeavy ? 'var(--error, #f87171)' : 'var(--text-hi)' }}>
          <span className="text-[10px]" style={{ color: 'var(--text-lo)' }}>({setsB})</span> {labelB}
        </span>
      </div>

      {/* Dual progress bar */}
      <div className="flex h-1.5 rounded-full overflow-hidden gap-px" style={{ background: 'var(--surface-2)' }}>
        <div
          className="h-full rounded-l-full"
          style={{ width: `${pctA}%`, background: barColorA, transition: 'width 0.4s ease' }}
        />
        <div
          className="h-full rounded-r-full"
          style={{ width: `${pctB}%`, background: barColorB, transition: 'width 0.4s ease' }}
        />
      </div>
    </div>
  )
}

export function AntagonistBalanceCard({ sets }: AntagonistBalanceCardProps) {
  const { chest, back, lats, quads, hamstrings, biceps, triceps } = sets
  const totalBack = back + lats

  // Skip rendering if no data at all
  if (chest + totalBack + quads + hamstrings + biceps + triceps === 0) return null

  return (
    <div className="glass p-4">
      <div className="t-label mb-4">Antagonist Balance</div>

      <div className="space-y-4">
        {(chest > 0 || totalBack > 0) && (
          <PairRow
            labelA="Chest"  setsA={chest}
            labelB="Back"   setsB={totalBack}
          />
        )}
        {(quads > 0 || hamstrings > 0) && (
          <PairRow
            labelA="Quads"      setsA={quads}
            labelB="Hamstrings" setsB={hamstrings}
          />
        )}
        {(biceps > 0 || triceps > 0) && (
          <PairRow
            labelA="Biceps"  setsA={biceps}
            labelB="Triceps" setsB={triceps}
          />
        )}
      </div>

      <p className="t-caption mt-3">
        Balanced ratios (40:60 to 60:40) reduce injury risk. Back should match or exceed chest.
      </p>
    </div>
  )
}
