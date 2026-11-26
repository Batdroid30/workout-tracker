import { cache } from 'react'
import { getProfile } from '@/lib/data/profile'
import { getRoutines } from '@/lib/data/routines'
import { getLastCompletedWorkout } from '@/lib/data/workouts'
import { getTodayReadiness } from '@/lib/data/readiness'
import { getRecentPRs, type RecentPR } from '@/lib/data/insights'
import { getProgressSnapshot } from '@/lib/data/progress-snapshot'
import { getVolumeLandmarksByMuscle, type MuscleVolumeLandmarkPoint } from '@/lib/data/phase-coach'
import { getSessionSuggestion, type SessionSuggestion } from '@/lib/data/splits'
import { COACH_PR_WINDOW_DAYS, getCoachSignals } from '@/lib/data/coach-signals'
import { setVolume, workoutBodyweight } from '@/lib/load'
import {
  pickCoachNote,
  pickHighlight,
  readinessSummary,
  tonnes,
  weekLabel,
  type CoachNote,
  type CoachSignalsInput,
  type Highlight,
  type HighlightWorkout,
  type ReadinessSummary,
} from '@/lib/home'
import type { Profile } from '@/types/database'

const DEFAULT_WEEKLY_GOAL = 3

export interface HomeModel {
  weekLabel: string | null
  workoutsDone: number
  workoutsGoal: number
  volumeTonnes: string
  readiness: ReadinessSummary | null
  coachNote: CoachNote | null
  highlight: Highlight | null
}

export interface HomeModelParts {
  scheme: { label: string } | null
  isDeloadWeek: boolean
  currentWeekStart: string
  currentWeekSessions: number
  weeklyGoal: number | null
  weeklyData: { weekStart: string; totalVolume: number }[]
  todayReadiness: { sleep_score: number; soreness_score: number; energy_score: number } | null
  coachInput: CoachSignalsInput
  recentPRs: RecentPR[]
  lastWorkout: HighlightWorkout | null
}

export function buildHomeModel(parts: HomeModelParts): HomeModel {
  // Both weeks use the UTC-Monday rule, so their keys match.
  const thisWeek = parts.weeklyData.find(week => week.weekStart === parts.currentWeekStart)
  return {
    weekLabel: weekLabel(parts.scheme, parts.scheme !== null && parts.isDeloadWeek),
    workoutsDone: parts.currentWeekSessions,
    workoutsGoal: parts.weeklyGoal ?? DEFAULT_WEEKLY_GOAL,
    volumeTonnes: tonnes(thisWeek?.totalVolume ?? 0),
    readiness: readinessSummary(parts.todayReadiness),
    coachNote: pickCoachNote(parts.coachInput),
    highlight: pickHighlight(parts.recentPRs, parts.lastWorkout),
  }
}

interface RecentWorkoutRow {
  id: string
  title: string | null
  started_at: string
  duration_seconds: number | null
  bodyweight_kg: number | string | null
  workout_exercises: { exercise: { name: string } | null; sets: { weight_kg: number | null; reps: number | null; is_warmup?: boolean | null }[] | null }[]
}

// Working sets only, matching the weekly volume on the same screen.
export function toHighlightWorkout(row: RecentWorkoutRow): HighlightWorkout {
  const bodyweight = workoutBodyweight(row.bodyweight_kg)
  const volumeKg = row.workout_exercises.reduce((total, entry) =>
    total + (entry.sets ?? []).filter(set => !set.is_warmup).reduce((sum, set) =>
      sum + setVolume(set.weight_kg ?? 0, set.reps ?? 0, entry.exercise?.name ?? '', bodyweight), 0), 0)
  return {
    id: row.id,
    title: row.title ?? 'Workout',
    startedAt: row.started_at,
    durationSeconds: row.duration_seconds,
    volumeKg,
  }
}

export interface HomeData {
  model: HomeModel
  suggestion: SessionSuggestion | null
  routines: Awaited<ReturnType<typeof getRoutines>>
  profile: Profile | null
  missedWeeks: number
  volumeLandmarks: MuscleVolumeLandmarkPoint[]
}

export const getHomeData = cache(async (userId: string): Promise<HomeData> => {
  const [profile, routines, suggestion, signals, snapshot, todayReadiness, recentPRs, lastWorkout] = await Promise.all([
    getProfile(userId),
    getRoutines(userId),
    getSessionSuggestion(userId),
    getCoachSignals(userId),
    getProgressSnapshot(userId),
    getTodayReadiness(userId),
    // Same window as the coach signals, so this shares their cached query;
    // pickHighlight keeps only the last week's PRs.
    getRecentPRs(userId, COACH_PR_WINDOW_DAYS),
    getLastCompletedWorkout(userId),
  ])

  const cycle = signals.trainingCycle
  const model = buildHomeModel({
    // The week chip only means something once a phase is running.
    scheme: profile?.phase_started_at ? cycle.scheme : null,
    isDeloadWeek: signals.isDeloadWeek,
    currentWeekStart: cycle.currentWeekStart,
    currentWeekSessions: cycle.currentWeekSessions,
    weeklyGoal: profile?.weekly_goal_sessions ?? null,
    weeklyData: snapshot.weeklyData,
    todayReadiness,
    coachInput: signals.input,
    recentPRs,
    lastWorkout: lastWorkout ? toHighlightWorkout(lastWorkout) : null,
  })

  const volumeLandmarks = await getVolumeLandmarksByMuscle(userId, profile, snapshot.currentWeekSetsByMuscle, snapshot.muscleFrequency)

  return { model, suggestion, routines, profile, missedWeeks: cycle.missedWeeks, volumeLandmarks }
})
