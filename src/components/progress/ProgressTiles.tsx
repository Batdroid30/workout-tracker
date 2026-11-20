import type { ReactNode } from 'react'
import Link from 'next/link'

interface ProgressTilesProps {
  strengthPctPerWeek: number | null
  indexLiftCount: number
  prsThisMonth: number
  workoutsThisMonth: number
  streakWeeks: number
  bodyweight: { latest: number; perWeek: number | null } | null
  /** Opens the lift picker; shown when there are too few lifts for a trend. */
  pickAction: ReactNode
}

const MIN_INDEX_LIFTS = 3

function signed(value: number, digits = 1): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`
}

export function ProgressTiles({ strengthPctPerWeek, indexLiftCount, prsThisMonth, workoutsThisMonth, streakWeeks, bodyweight, pickAction }: ProgressTilesProps) {
  const hasIndex = indexLiftCount >= MIN_INDEX_LIFTS && strengthPctPerWeek !== null
  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile label="Overall strength">
        {hasIndex && strengthPctPerWeek !== null ? (
          <>
            <p className={`t-value mt-1 ${strengthPctPerWeek > 0 ? 'text-positive' : strengthPctPerWeek < 0 ? 'text-caution' : ''}`}>{signed(strengthPctPerWeek)}%</p>
            <p className="t-caption">a week, your lifts</p>
          </>
        ) : indexLiftCount >= MIN_INDEX_LIFTS ? (
          <p className="t-body-sm mt-1">Your trend appears after a couple more weeks of training</p>
        ) : (
          <>
            <p className="t-body-sm mt-1">Pick 3 or more lifts you train to see your overall trend</p>
            <div className="-ml-2 mt-1">{pickAction}</div>
          </>
        )}
      </Tile>
      <Tile label="Recent PRs">
        <p className="t-value mt-1">{prsThisMonth}</p>
        <p className="t-caption">this month</p>
        <TileLink href="/progress/more#prs">See all</TileLink>
      </Tile>
      <Tile label="This month">
        <p className="t-value mt-1">{workoutsThisMonth}</p>
        <p className="t-caption">workouts{streakWeeks > 0 ? ` · ${streakWeeks} wk streak` : ''}</p>
      </Tile>
      <Tile label="Bodyweight">
        {bodyweight ? (
          <>
            <p className="t-value mt-1">{bodyweight.latest} kg</p>
            <p className="t-caption">{bodyweight.perWeek === null ? 'Trend after a week of weigh-ins' : `${signed(bodyweight.perWeek)} kg a week`}</p>
          </>
        ) : (
          <>
            <p className="t-body-sm mt-1">No weigh-ins yet</p>
            <TileLink href="/progress/more#bodyweight">Log your weight</TileLink>
          </>
        )}
      </Tile>
    </div>
  )
}

function TileLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="focus-ring -ml-1 inline-flex min-h-11 items-center rounded px-1 text-sm font-medium text-secondary">
      {children} ›
    </Link>
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
