import type { ReactNode } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui'
import { Sparkline } from './Sparkline'
import type { LiftTrend, TrendDirection } from '@/lib/tracked-lifts'

export interface LiftRow {
  exerciseId: string
  name: string
  trend: LiftTrend | null
}

interface YourLiftsCardProps {
  rows: LiftRow[]
  source: 'picked' | 'auto'
  /** The Edit / Pick lifts control (opens the picker). */
  action: ReactNode
}

const TONE: Record<TrendDirection, string> = {
  up: 'text-positive',
  flat: 'text-tertiary',
  down: 'text-caution',
}

const ARROW: Record<TrendDirection, string> = { up: '↑', flat: '→', down: '↓' }

function formatKg(value: number): string {
  return String(Math.round(value * 10) / 10)
}

export function YourLiftsCard({ rows, source, action }: YourLiftsCardProps) {
  return (
    <Card padding="none" as="section">
      <div className="flex items-center justify-between px-4 pt-3">
        <div>
          <h2 className="t-title-3">Your lifts</h2>
          {source === 'auto' && rows.length > 0 && <p className="t-caption">Your most-trained lifts</p>}
        </div>
        {action}
      </div>

      {rows.length === 0 ? (
        <p className="t-body-sm px-4 pb-4 pt-1">Log a few workouts and your main lifts appear here.</p>
      ) : (
        <ul className="mt-1">
          {rows.map((row, index) => (
            <li key={row.exerciseId} className={index > 0 ? 'border-t border-border' : undefined}>
              <Link href={`/exercises/${row.exerciseId}`} className="focus-ring flex min-h-14 items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="t-body block truncate">{row.name}</span>
                  <span className="t-caption block">{row.trend ? 'Estimated max' : 'No sets in 12 weeks'}</span>
                </span>
                {row.trend && (
                  <>
                    <span className="text-right">
                      <span className="t-value block">{formatKg(row.trend.current)}</span>
                      <span className={`mono block text-xs ${TONE[row.trend.direction]}`}>
                        {row.trend.change === null
                          ? 'First week'
                          : `${ARROW[row.trend.direction]} ${formatKg(Math.abs(row.trend.change))} kg`}
                      </span>
                    </span>
                    <span className={TONE[row.trend.direction]}><Sparkline points={row.trend.points} /></span>
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
