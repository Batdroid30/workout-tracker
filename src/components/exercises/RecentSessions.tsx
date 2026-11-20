import { Card } from '@/components/ui'
import type { RecentSession } from '@/lib/lift-range'

function dayLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function RecentSessions({ sessions }: { sessions: RecentSession[] }) {
  if (sessions.length === 0) return null
  return (
    <Card padding="none" as="section">
      <h2 className="t-title-3 px-4 pt-3 pb-1">Recent sessions</h2>
      <ul>
        {sessions.map(session => (
          <li key={session.id} className="flex min-h-11 items-center justify-between gap-3 border-t border-border px-4 py-2">
            <span className="t-body-sm shrink-0">{dayLabel(session.date)}</span>
            <span className="mono truncate text-sm text-primary">
              {session.sets.map(set => `${set.weight}×${set.reps}`).join(' · ')}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
