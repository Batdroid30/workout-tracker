import type { ReactNode } from 'react'

interface ProgressTilesProps {
  strengthPctPerWeek: number | null
  indexLiftCount: number
  prsThisMonth: number
  workoutsThisMonth: number
  streakWeeks: number
  bodyweight: { latest: number; perWeek: number | null } | null
}

const MIN_INDEX_LIFTS = 3

function signed(value: number, digits = 1): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`
}

export function ProgressTiles({ strengthPctPerWeek, indexLiftCount, prsThisMonth, workoutsThisMonth, streakWeeks, bodyweight }: ProgressTilesProps) {
  const hasIndex = indexLiftCount >= MIN_INDEX_LIFTS && strengthPctPerWeek !== null
  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile label="Overall strength">
        {hasIndex && strengthPctPerWeek !== null ? (
          <>
            <p className={`t-value mt-1 ${strengthPctPerWeek > 0 ? 'text-positive' : strengthPctPerWeek < 0 ? 'text-caution' : ''}`}>{signed(strengthPctPerWeek)}%</p>
            <p className="t-caption">a week, your lifts</p>
          </>
        ) : (
          <p className="t-body-sm mt-1">Pick 3 or more lifts you train to see your overall trend</p>
        )}
      </Tile>
      <Tile label="Recent PRs">
        <p className="t-value mt-1">{prsThisMonth}</p>
        <p className="t-caption">this month</p>
      </Tile>
      <Tile label="This month">
        <p className="t-value mt-1">{workoutsThisMonth}</p>
        <p className="t-caption">workouts{streakWeeks > 0 ? ` · ${streakWeeks} wk streak` : ''}</p>
      </Tile>
      <Tile label="Bodyweight">
        {bodyweight ? (
          <>
            <p className="t-value mt-1">{bodyweight.latest} kg</p>
            <p className="t-caption">{bodyweight.perWeek === null ? 'Log again to see a trend' : `${signed(bodyweight.perWeek)} kg a week`}</p>
          </>
        ) : (
          <p className="t-body-sm mt-1">Log your weight on More stats</p>
        )}
      </Tile>
    </div>
  )
}

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-surface p-3.5">
      <p className="t-caption">{label}</p>
      {children}
    </div>
  )
}
