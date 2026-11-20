// Small numbers on the Progress overview.

const DAY_MS = 86_400_000
const DAYS_PER_WEEK = 7

export function workoutsInMonth(entries: { date: string; count: number }[], now: Date): number {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return entries.filter(entry => entry.date.startsWith(month)).reduce((sum, entry) => sum + entry.count, 0)
}

// Weigh-ins oldest first. The weekly change is the straight line from the first to the last.
export function bodyweightTrend(points: { date: string; weight_kg: number }[]): { latest: number; perWeek: number | null } | null {
  if (points.length === 0) return null
  const first = points[0]
  const last = points[points.length - 1]
  const weeks = (new Date(last.date).getTime() - new Date(first.date).getTime()) / DAY_MS / DAYS_PER_WEEK
  const perWeek = weeks > 0 ? Math.round(((last.weight_kg - first.weight_kg) / weeks) * 10) / 10 : null
  return { latest: last.weight_kg, perWeek }
}
