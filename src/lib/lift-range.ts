// What a lift's page leads with: its estimated max now, its best, and how it moved.

import { calculate1RM } from '@/lib/algorithms'

export type LiftRange = '4w' | '12w' | '1y' | 'all'

const DAY_MS = 86_400_000
const RANGE_DAYS: Record<Exclude<LiftRange, 'all'>, number> = { '4w': 28, '12w': 84, '1y': 365 }
const HEADLINE_WEEKS_DAYS = RANGE_DAYS['12w']

function cutoff(days: number, now: Date): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString().slice(0, 10)
}

export function pointsInRange<T extends { date: string }>(points: T[], range: LiftRange, now: Date): T[] {
  if (range === 'all') return points
  const from = cutoff(RANGE_DAYS[range], now)
  return points.filter(point => point.date >= from)
}

// The chart opens on 12 weeks, widening only when that would leave it empty.
const DEFAULT_RANGE_ORDER: LiftRange[] = ['12w', '1y', 'all']

export function defaultRange<T extends { date: string }>(points: T[], now: Date): LiftRange {
  return DEFAULT_RANGE_ORDER.find(range => pointsInRange(points, range, now).length > 1) ?? '12w'
}

export interface LiftHeadline {
  current: number | null
  best: number | null
  isBest: boolean
  /** Latest minus the earliest session in the last 12 weeks; null with fewer than two. */
  change12w: number | null
  lastTrained: string | null
  /** No sessions in the last 12 weeks, so "current" is an old number. */
  isStale: boolean
}

// Monday of the date's week (UTC), the same week Progress uses.
function weekOf(date: string): string {
  const day = new Date(`${date}T00:00:00Z`)
  const back = (day.getUTCDay() + 6) % 7
  return new Date(day.getTime() - back * DAY_MS).toISOString().slice(0, 10)
}

function weeklyBests(points: { date: string; best1RM: number }[]): number[] {
  const byWeek = new Map<string, number>()
  for (const point of points) {
    const week = weekOf(point.date)
    byWeek.set(week, Math.max(byWeek.get(week) ?? 0, point.best1RM))
  }
  return [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value)
}

// Week-by-week, like the Progress overview: so both pages show the same numbers.
export function liftHeadline(points: { date: string; best1RM: number }[], now: Date): LiftHeadline {
  if (points.length === 0) return { current: null, best: null, isBest: false, change12w: null, lastTrained: null, isStale: false }
  const weeks = weeklyBests(points)
  const current = weeks[weeks.length - 1]
  const best = Math.max(...weeks)
  const windowStart = cutoff(HEADLINE_WEEKS_DAYS, now)
  const windowWeeks = weeklyBests(points.filter(point => point.date >= windowStart))
  const change12w = windowWeeks.length >= 2
    ? Math.round((windowWeeks[windowWeeks.length - 1] - windowWeeks[0]) * 10) / 10
    : null
  const lastTrained = points.reduce((latest, point) => (point.date > latest ? point.date : latest), points[0].date)
  return { current, best, isBest: current >= best, change12w, lastTrained, isStale: lastTrained < windowStart }
}

export interface RecentSession {
  /** The workout's id: two workouts can fall on the same day. */
  id: string
  date: string
  sets: { weight: number; reps: number }[]
}

interface SessionInput {
  id: string
  startedAt: string
  sets: { weight_kg: number | null; reps: number | null; is_warmup: boolean | null; set_number: number | null }[]
}

// Working sets only, in the order they were done; newest session first.
export function recentSessionsFrom(sessions: SessionInput[], limit: number): RecentSession[] {
  return [...sessions]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map(session => ({
      id: session.id,
      date: new Date(session.startedAt).toISOString().slice(0, 10),
      sets: [...session.sets]
        .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0))
        .filter(set => !set.is_warmup && (set.weight_kg ?? 0) > 0 && (set.reps ?? 0) > 0)
        .map(set => ({ weight: Number(set.weight_kg), reps: Number(set.reps) })),
    }))
    .filter(session => session.sets.length > 0)
    .slice(0, limit)
}

export function bestRecentSet(sessions: RecentSession[]): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number; e1rm: number } | null = null
  for (const set of sessions.flatMap(session => session.sets)) {
    const e1rm = calculate1RM(set.weight, set.reps)
    if (!best || e1rm > best.e1rm) best = { ...set, e1rm }
  }
  return best ? { weight: best.weight, reps: best.reps } : null
}
