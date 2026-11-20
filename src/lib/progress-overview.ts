// Small numbers on the Progress overview.

const DAY_MS = 86_400_000
const DAYS_PER_WEEK = 7

// "This month" is the calendar month in UTC, the timezone workout dates are stored in.
export function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export function workoutsInMonth(entries: { date: string; count: number }[], now: Date): number {
  const month = monthStart(now).toISOString().slice(0, 7)
  return entries.filter(entry => entry.date.startsWith(month)).reduce((sum, entry) => sum + entry.count, 0)
}

// Weigh-ins oldest first. The weekly change is the straight line from the first to the last,
// given only once they span a week: day-to-day water swings would otherwise read as kilos a week.
export function bodyweightTrend(points: { date: string; weight_kg: number }[]): { latest: number; perWeek: number | null } | null {
  if (points.length === 0) return null
  const first = points[0]
  const last = points[points.length - 1]
  const weeks = (new Date(last.date).getTime() - new Date(first.date).getTime()) / DAY_MS / DAYS_PER_WEEK
  const perWeek = weeks >= 1 ? Math.round(((last.weight_kg - first.weight_kg) / weeks) * 10) / 10 : null
  return { latest: last.weight_kg, perWeek }
}
