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

export interface LiftHeadline {
  current: number | null
  best: number | null
  isBest: boolean
  /** Latest minus the earliest session in the last 12 weeks; null with fewer than two. */
  change12w: number | null
}

export function liftHeadline(points: { date: string; best1RM: number }[], now: Date): LiftHeadline {
  if (points.length === 0) return { current: null, best: null, isBest: false, change12w: null }
  const current = points[points.length - 1].best1RM
  const best = Math.max(...points.map(point => point.best1RM))
  const window = points.filter(point => point.date >= cutoff(HEADLINE_WEEKS_DAYS, now))
  const change12w = window.length >= 2 ? Math.round((current - window[0].best1RM) * 10) / 10 : null
  return { current, best, isBest: current >= best, change12w }
}

export interface RecentSession {
  date: string
  sets: { weight: number; reps: number }[]
}

// Working sets only, newest session first.
export function recentSessionsFrom(
  sessions: { date: string; sets: { weight_kg: number | null; reps: number | null; is_warmup: boolean | null }[] }[],
  limit: number,
): RecentSession[] {
  return [...sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(session => ({
      date: session.date,
      sets: session.sets
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
