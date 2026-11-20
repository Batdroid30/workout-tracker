import { DELOAD_THRESHOLDS, WUP_CYCLE, type WUPScheme } from '@/lib/workout-intelligence'
import type { ExperienceLevel, TrainingPhase } from '@/types/database'

// The weekly Strength → Hypertrophy → Volume cycle and phase weeks advance
// by *training weeks*, not calendar weeks, so time off pauses them instead
// of using them up. A training week is a Monday–Sunday (UTC) week with at
// least half the weekly goal of completed workouts. The current week never
// counts until it ends.

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS

export interface CycleInput {
  completedWorkoutDates: string[]
  weeklyGoal: number
  cycleStartedAt: string | null
  phaseStartedAt: string | null
  breakPromptDismissedAt: string | null
  experienceLevel: ExperienceLevel | null
  trainingPhase: TrainingPhase | null
  now: Date
}

export interface TrainingWeek {
  weekStart: string
  sessions: number
}

export interface TrainingCycle {
  scheme: WUPScheme
  cycleWeek: 1 | 2 | 3
  phaseWeek: number
  isDeloadWeek: boolean
  missedWeeks: number
  offerRestart: boolean
  phaseTrainingWeeks: TrainingWeek[]
  currentWeekStart: string
  currentWeekSessions: number
}

export function trainingWeekThreshold(weeklyGoal: number): number {
  return Math.max(1, Math.ceil(weeklyGoal / 2))
}

// Same UTC Monday rule as the weekly volume charts (getMondayOf).
function mondayOf(date: Date): number {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const weekday = day.getUTCDay()
  const back = weekday === 0 ? 6 : weekday - 1
  return day.getTime() - back * DAY_MS
}

// A restart mid-week doesn't count that week; a Monday restart does.
function firstEligibleWeek(since: string): number {
  const sinceDate = new Date(since)
  const monday = mondayOf(sinceDate)
  return sinceDate.getUTCDay() === 1 ? monday : monday + WEEK_MS
}

function sessionsByWeek(dates: string[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const date of dates) {
    const week = mondayOf(new Date(date))
    counts.set(week, (counts.get(week) ?? 0) + 1)
  }
  return counts
}

function completeWeeks(since: string | null, now: Date): number[] {
  if (!since) return []
  const weeks: number[] = []
  const currentWeek = mondayOf(now)
  for (let week = firstEligibleWeek(since); week < currentWeek; week += WEEK_MS) {
    weeks.push(week)
  }
  return weeks
}

const toDateString = (week: number) => new Date(week).toISOString().slice(0, 10)

export function listTrainingWeeks(
  dates: string[], since: string | null, now: Date, weeklyGoal: number,
): TrainingWeek[] {
  const counts = sessionsByWeek(dates)
  const threshold = trainingWeekThreshold(weeklyGoal)
  return completeWeeks(since, now)
    .filter(week => (counts.get(week) ?? 0) >= threshold)
    .map(week => ({ weekStart: toDateString(week), sessions: counts.get(week) ?? 0 }))
}

export function countCompletedTrainingWeeks(
  dates: string[], since: string | null, now: Date, weeklyGoal: number,
): number {
  return listTrainingWeeks(dates, since, now, weeklyGoal).length
}

function recentMissedWeeks(dates: string[], since: string | null, now: Date, weeklyGoal: number): number[] {
  const counts = sessionsByWeek(dates)
  const threshold = trainingWeekThreshold(weeklyGoal)
  const missed: number[] = []
  for (const week of completeWeeks(since, now).reverse()) {
    if ((counts.get(week) ?? 0) >= threshold) break
    missed.push(week)
  }
  return missed
}

export function countRecentMissedWeeks(
  dates: string[], since: string | null, now: Date, weeklyGoal: number,
): number {
  return recentMissedWeeks(dates, since, now, weeklyGoal).length
}

export function buildTrainingCycle(input: CycleInput): TrainingCycle {
  const { completedWorkoutDates: dates, weeklyGoal, now } = input

  const cycleWeeks = countCompletedTrainingWeeks(dates, input.cycleStartedAt, now, weeklyGoal)
  const cycleIndex = cycleWeeks % WUP_CYCLE.length
  const phaseTrainingWeeks = listTrainingWeeks(dates, input.phaseStartedAt, now, weeklyGoal)
  const phaseWeek = phaseTrainingWeeks.length + 1

  // DELOAD_THRESHOLDS = training weeks before a deload is due, so the deload
  // is the week after them (the same blocks the mesocycle timeline shows).
  const weeksBeforeDeload = DELOAD_THRESHOLDS[input.experienceLevel ?? 'intermediate'][input.trainingPhase ?? 'maingaining']
  const isDeloadWeek = input.phaseStartedAt !== null && phaseWeek % (weeksBeforeDeload + 1) === 0

  const currentWeek = mondayOf(now)
  const currentWeekSessions = sessionsByWeek(dates).get(currentWeek) ?? 0

  const missed = recentMissedWeeks(dates, input.phaseStartedAt, now, weeklyGoal)
  const breakStart = missed.length > 0 ? missed[missed.length - 1] : null
  const dismissedThisBreak = breakStart !== null && input.breakPromptDismissedAt !== null
    && new Date(input.breakPromptDismissedAt).getTime() >= breakStart

  return {
    scheme: WUP_CYCLE[cycleIndex],
    cycleWeek: cycleWeekNumber(cycleIndex),
    phaseWeek,
    isDeloadWeek,
    missedWeeks: missed.length,
    offerRestart: missed.length >= 2 && !dismissedThisBreak,
    phaseTrainingWeeks,
    currentWeekStart: toDateString(currentWeek),
    currentWeekSessions,
  }
}

function cycleWeekNumber(index: number): 1 | 2 | 3 {
  if (index === 1) return 2
  if (index === 2) return 3
  return 1
}

// Where the weekly cycle counts from: its own start, else the phase start,
// else the lifter's first completed workout — so it always advances.
export function resolveCycleAnchor(
  cycleStartedAt: string | null,
  phaseStartedAt: string | null,
  firstWorkoutAt: string | null,
): string | null {
  return cycleStartedAt ?? phaseStartedAt ?? firstWorkoutAt
}

export interface CycleSignals {
  scheme: WUPScheme | null
  isDeloadWeek: boolean
  isPhaseTransition: boolean
}

// What set suggestions need from the cycle. A missing cycle only removes the
// cycle-dependent hints; the rest of the suggestion still works.
export function cycleSignals(current: TrainingCycle | null, lastWorkoutScheme: WUPScheme | null): CycleSignals {
  if (!current) return { scheme: null, isDeloadWeek: false, isPhaseTransition: false }
  return {
    scheme: current.scheme,
    isDeloadWeek: current.isDeloadWeek,
    isPhaseTransition: lastWorkoutScheme !== null && lastWorkoutScheme.label !== current.scheme.label,
  }
}
