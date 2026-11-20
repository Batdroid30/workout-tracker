import { cache } from 'react'
import { getProfile } from '@/lib/data/profile'
import { getBodyweightHistory } from '@/lib/data/bodyweight'
import { getRecentReadinessLogs } from '@/lib/data/readiness'
import {
  getRecentPRs,
  getNeglectedMuscles,
  detectHypertrophicDissociation,
  type HypertrophicDissociationResult,
  type NeglectedMuscle,
  type StalledMovement,
} from '@/lib/data/insights'
import { computeStrengthIndex, getVolumeLandmarksByMuscle, buildThisWeekMissions, type Mission } from '@/lib/data/phase-coach'
import { getProgressSnapshot, type ProgressSnapshot, type StalenessEntry } from '@/lib/data/progress-snapshot'
import { getTrainingCycle } from '@/lib/data/training-cycle'
import { getStrengthLifts } from '@/lib/data/strength-lifts'
import { assessFatigueLevel, type FatigueAssessment } from '@/lib/algorithms'
import { STALL_VARIATION_ADVICE } from '@/lib/workout-intelligence'
import { isPhaseTransitionDue } from '@/lib/phase-transition'
import { PUSH_MUSCLES, PULL_MUSCLES } from '@/lib/training-constants'
import type { TrainingCycle } from '@/lib/training-cycle'
import type { CoachSignalsInput } from '@/lib/home'

const STALL_WINDOW_WEEKS = 3
const STALL_GAIN_LIMIT = 0.03
const MAX_STALLED = 3

export interface CoachSignals {
  input: CoachSignalsInput
  fatigue: FatigueAssessment
  dissociation: HypertrophicDissociationResult
  missions: Mission[]
  trainingCycle: TrainingCycle
  neglectedMuscles: NeglectedMuscle[]
  phaseWeek: number | null
  isDeloadWeek: boolean
}

// A lift has stalled when it gained under 3% across the window with at least
// two sessions on each side of the comparison.
export function stalledMovementsFrom(staleness: Map<string, StalenessEntry>): StalledMovement[] {
  return Array.from(staleness.values())
    .filter(entry =>
      entry.previousBest > 0
      && entry.recentBest > 0
      && entry.recentSessions >= 2
      && entry.previousSessions >= 2
      && (entry.recentBest - entry.previousBest) / entry.previousBest < STALL_GAIN_LIMIT,
    )
    .map(entry => {
      const totalKg = entry.recentBest - entry.previousBest
      const movementKey = `${entry.muscleGroup}-${entry.movementPattern}`
      return {
        exerciseName: entry.name,
        currentBest: Math.round(entry.recentBest * 10) / 10,
        previousBest: Math.round(entry.previousBest * 10) / 10,
        pctPerWeek: Math.round(((totalKg / entry.previousBest) * 100 / STALL_WINDOW_WEEKS) * 100) / 100,
        kgPerWeek: Math.round((totalKg / STALL_WINDOW_WEEKS) * 100) / 100,
        advice: Object.entries(STALL_VARIATION_ADVICE).find(([key]) => key === movementKey)?.[1] ?? [],
      }
    })
    .sort((a, b) => a.pctPerWeek - b.pctPerWeek)
    .slice(0, MAX_STALLED)
}

function pushPullBalance(snapshot: ProgressSnapshot) {
  let pushSets = 0
  let pullSets = 0
  for (const week of snapshot.weeklyData.slice(-4)) {
    for (const [muscle, count] of Object.entries(week.setsByMuscle)) {
      if (PUSH_MUSCLES.has(muscle)) pushSets += count
      else if (PULL_MUSCLES.has(muscle)) pullSets += count
    }
  }
  const ratio = pushSets === 0 && pullSets === 0 ? null : pullSets === 0 ? Infinity : pushSets / pullSets
  return { pushSets, pullSets, ratio }
}

export const getCoachSignals = cache(async (userId: string): Promise<CoachSignals> => {
  const [profile, snapshot, recentPRs, neglectedMuscles, bwHistory, recentReadiness, trainingCycle, strengthLifts] = await Promise.all([
    getProfile(userId),
    getProgressSnapshot(userId),
    getRecentPRs(userId, 60),
    getNeglectedMuscles(userId),
    getBodyweightHistory(userId, 4),
    getRecentReadinessLogs(userId, 7),
    getTrainingCycle(userId),
    getStrengthLifts(userId),
  ])

  const volumeLandmarks = await getVolumeLandmarksByMuscle(userId, profile, snapshot.currentWeekSetsByMuscle, snapshot.muscleFrequency)
  const strengthIndex = computeStrengthIndex(snapshot.exerciseWeeklyE1RM, strengthLifts.indexLifts, profile)
  const stalledMovements = stalledMovementsFrom(snapshot.exerciseStaleness)
  const weeks = snapshot.weeklyData.map(week => ({
    week_start: week.weekStart,
    total_volume: week.totalVolume,
    workout_count: week.sessionCount,
    avg_rpe: week.avgRpe,
  }))

  const fatigue = assessFatigueLevel(weeks, recentPRs[0]?.daysAgo ?? null, profile ? {
    experience_level: profile.experience_level,
    training_phase: profile.training_phase,
    phase_started_at: profile.phase_started_at,
    phase_week: trainingCycle.phaseWeek,
  } : null, recentReadiness)
  const dissociation = detectHypertrophicDissociation(bwHistory, strengthIndex.pctPerWeek, profile?.training_phase ?? null)

  const phaseWeek = profile?.phase_started_at ? trainingCycle.phaseWeek : null
  const isDeloadWeek = fatigue.shouldSuggest || trainingCycle.isDeloadWeek

  const missions = buildThisWeekMissions({
    stalledMovements,
    neglectedMuscles,
    volumeLandmarks,
    pushPullBalance: pushPullBalance(snapshot),
    keyLifts: snapshot.keyLifts,
    recentLoads: snapshot.recentLoads,
    scheme: trainingCycle.scheme,
    isDeloadWeek: trainingCycle.isDeloadWeek,
    profile: profile ? {
      training_goal: profile.training_goal,
      experience_level: profile.experience_level,
      phase_started_at: profile.phase_started_at ?? null,
      training_phase: profile.training_phase ?? null,
    } : null,
  })

  const topStall = stalledMovements[0]
  const topNeglected = neglectedMuscles[0]
  return {
    input: {
      offerRestart: trainingCycle.offerRestart,
      missedWeeks: trainingCycle.missedWeeks,
      shouldDeload: fatigue.shouldSuggest,
      deloadReason: fatigue.signals[0] ?? null,
      phaseTransitionDue: isPhaseTransitionDue({
        experienceLevel: profile?.experience_level ?? null,
        trainingPhase: profile?.training_phase ?? null,
        phaseWeek,
      }),
      dissociation: { hasDissociation: dissociation.detected, message: dissociation.message },
      stalledLift: topStall ? { exerciseName: topStall.exerciseName, pctPerWeek: topStall.pctPerWeek } : null,
      neglectedMuscle: topNeglected ?? null,
    },
    fatigue,
    dissociation,
    missions,
    trainingCycle,
    neglectedMuscles,
    phaseWeek,
    isDeloadWeek,
  }
})
