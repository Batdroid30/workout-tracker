'use client'

import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { Card, Chip, ToggleChip } from '@/components/ui'
import { ProgressionLineChart } from '@/components/ui/ProgressionLineChart'
import { defaultRange, liftHeadline, pointsInRange, type LiftRange } from '@/lib/lift-range'

const RANGES: { value: LiftRange; label: string }[] = [
  { value: '4w', label: '4W' },
  { value: '12w', label: '12W' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
]

interface LiftHeroCardProps {
  points: { date: string; best1RM: number }[]
  /** Today as YYYY-MM-DD, from the server, so both renders agree. */
  today: string
}

function formatKg(value: number): string {
  return String(Math.round(value * 10) / 10)
}

function dayLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function LiftHeroCard({ points, today }: LiftHeroCardProps) {
  const now = new Date(`${today}T12:00:00Z`)
  const [range, setRange] = useState<LiftRange>(() => defaultRange(points, now))
  const headline = liftHeadline(points, now)
  const shown = pointsInRange(points, range, now)

  if (headline.current === null) {
    return (
      <Card as="section">
        <p className="t-caption">Estimated max</p>
        <p className="t-body-sm mt-1">Log this lift to see its estimated max.</p>
      </Card>
    )
  }

  const change = headline.change12w
  const tone = change === null ? 'text-tertiary' : change > 1 ? 'text-positive' : change < -1 ? 'text-caution' : 'text-tertiary'
  const arrow = change === null ? '' : change > 1 ? '↑' : change < -1 ? '↓' : '→'

  return (
    <Card as="section">
      <p className="t-caption">Estimated max</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="t-stat">{formatKg(headline.current)}</span>
        <span className="mono text-secondary">kg</span>
        {headline.isBest && !headline.isStale && <Chip tone="accent" icon={<Trophy className="h-3.5 w-3.5" aria-hidden="true" />}>Best ever</Chip>}
      </div>
      {headline.isStale && headline.lastTrained && (
        <p className="t-body-sm mt-1">Last trained {dayLabel(headline.lastTrained)}</p>
      )}
      {change !== null && (
        <p className={`mono mt-1 text-sm ${tone}`}>{arrow} {formatKg(Math.abs(change))} kg in 12 weeks</p>
      )}

      <div className="mt-4 flex gap-2" role="group" aria-label="Chart range">
        {RANGES.map(option => (
          <ToggleChip key={option.value} size="sm" selected={range === option.value} onClick={() => setRange(option.value)}>
            {option.label}
          </ToggleChip>
        ))}
      </div>
      <div className="mt-3 h-[180px] w-full">
        {shown.length > 1
          ? <ProgressionLineChart data={shown.map(point => ({ date: point.date, value: point.best1RM }))} formatType="number" />
          : <p className="t-body-sm pt-6 text-center">Not enough sessions in this range yet.</p>}
      </div>
    </Card>
  )
}
