import type { KeyLift } from '@/lib/data/phase-coach'

interface IndexLiftChipsProps {
  /** The lifts the strength index averages (see getStrengthLifts). */
  lifts: KeyLift[]
  source: 'picked' | 'auto'
}

const CAPTION: Record<IndexLiftChipsProps['source'], string> = {
  picked: 'The lifts you picked on Progress, with sets in the last 12 weeks.',
  auto: 'Your most-trained lifts in the last 12 weeks. Pick your own on Progress.',
}

export function IndexLiftChips({ lifts, source }: IndexLiftChipsProps) {
  if (lifts.length === 0) return null
  return (
    <div className="mt-4 pt-3 border-t border-border">
      <p className="t-label mb-2">Tracked lifts ({lifts.length})</p>
      <div className="flex flex-wrap gap-1.5">
        {lifts.map(lift => (
          <span
            key={lift.exerciseId}
            className="text-xs font-medium rounded px-2 py-1 text-secondary bg-surface-raised border border-border"
            title={`${lift.sessionCount} weeks trained in the last 12`}
          >
            {lift.exerciseName}
          </span>
        ))}
      </div>
      <p className="t-caption mt-2">{CAPTION[source]}</p>
    </div>
  )
}
