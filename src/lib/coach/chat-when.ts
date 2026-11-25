const DAY_MS = 86_400_000
const WEEK_DAYS = 7

function utcDay(date: Date): number {
  return Math.floor(date.getTime() / DAY_MS)
}

// When a coach chat was last active, as a short label for the Recent chats list.
// Days are UTC, like workout dates elsewhere in the app.
export function chatWhen(isoDate: string, now: Date): string {
  const date = new Date(isoDate)
  const daysAgo = utcDay(now) - utcDay(date)
  if (daysAgo <= 0) return 'Today'
  if (daysAgo === 1) return 'Yesterday'
  if (daysAgo < WEEK_DAYS) return date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}
