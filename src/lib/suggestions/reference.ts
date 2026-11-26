import { sessionE1rm } from './capacity'
import type { PastSession, PlanContext, WeekKind } from './types'

export const REFERENCE_WINDOW_WEEKS = 8
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
const STALL_EXPOSURES = 3

export interface ReferencePick { session: PastSession; sameType: boolean }

function isSameType(session: PastSession, weekKind: WeekKind): boolean {
  return !session.isDeload && session.weekKind === weekKind
}

/** Sessions are newest first. Prefers a like-for-like week type within the window. */
export function pickReference(
  sessions: PastSession[], weekKind: WeekKind, now: Date,
): ReferencePick | null {
  const windowStartMs = now.getTime() - REFERENCE_WINDOW_WEEKS * MS_PER_WEEK
  const sameType = sessions.find(session =>
    isSameType(session, weekKind) && Date.parse(session.startedAt) >= windowStartMs)
  if (sameType) return { session: sameType, sameType: true }
  const newestWorking = sessions.find(session => !session.isDeload)
  return newestWorking ? { session: newestWorking, sameType: false } : null
}

export function sameTypeExposures(
  sessions: PastSession[], weekKind: WeekKind, count: number,
): PastSession[] {
  return sessions.filter(session => isSameType(session, weekKind)).slice(0, count)
}

/** Exposures are newest first; each e1RM is compared with the next-older one. */
export function isStalled(exposures: PastSession[], phase: PlanContext['phase']): boolean {
  const recent = exposures.slice(0, STALL_EXPOSURES)
  if (recent.length < STALL_EXPOSURES) return false
  const [newestWeight] = recent.map(session => session.sets[0]?.weightKg)
  if (recent.some(session => session.sets[0]?.weightKg !== newestWeight)) return false
  const e1rms = recent.map(sessionE1rm)
  const [newest, middle, oldest] = e1rms
  if (newest === null || middle === null || oldest === null) return false
  if (phase === 'cutting') return newest < middle && middle < oldest
  return newest <= middle && middle <= oldest
}

export function topOfRangeStreak(exposures: PastSession[], max: number): number {
  const newestWeight = exposures[0]?.sets[0]?.weightKg
  let streak = 0
  for (const session of exposures) {
    const [firstSet] = session.sets
    if (!firstSet || firstSet.reps < max || firstSet.weightKg !== newestWeight) break
    streak += 1
  }
  return streak
}
