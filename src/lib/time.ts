// Times shown during a workout are worked out from timestamps, never counted
// tick by tick, so they're right after the phone has been asleep.

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60

const pad = (value: number) => String(value).padStart(2, '0')

// "1:14" under an hour, "1:02:05" from an hour.
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / MS_PER_SECOND))
  const seconds = totalSeconds % SECONDS_PER_MINUTE
  const totalMinutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
  if (hours === 0) return `${totalMinutes}:${pad(seconds)}`
  return `${hours}:${pad(totalMinutes % MINUTES_PER_HOUR)}:${pad(seconds)}`
}

export function restRemainingMs(rest: { endsAt: number } | null, now: number): number | null {
  if (!rest) return null
  return Math.max(0, rest.endsAt - now)
}

function localDate(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

// Compares calendar days where the lifter is, not on the server's UTC clock.
export function isSameLocalDay(iso: string, now: Date, timeZone?: string): boolean {
  return localDate(new Date(iso), timeZone) === localDate(now, timeZone)
}
