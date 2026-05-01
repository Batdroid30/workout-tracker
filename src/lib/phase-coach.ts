/**
 * phase-coach.ts
 *
 * Pure constants and functions for the Phase Coach surface.
 * No DB, no async, no side effects — safe to import anywhere.
 *
 * Two concepts live here:
 *   1. Volume Landmarks (MV / MEV / MAV / MRV) per muscle group, with phase-
 *      and style-aware adjustments.
 *   2. Strength gain expectations per experience × phase, used to grade the
 *      user's Strength Index trend as below / on track / above what's
 *      realistic for their training age.
 */

import type {
  MuscleGroup,
  ExperienceLevel,
  TrainingPhase,
  TrainingStyle,
} from '@/types/database'
import { DELOAD_THRESHOLDS } from '@/lib/workout-intelligence'

// ── Volume Landmarks ─────────────────────────────────────────────────────────
//
// Working sets per muscle per week, assuming volume-style training (RIR 1–3).
//
//   MV  Maintenance Volume        — minimum to retain muscle
//   MEV Minimum Effective Volume  — threshold for new growth
//   MAV Maximum Adaptive Volume   — sweet spot, maximises hypertrophy
//   MRV Maximum Recoverable Volume — beyond this, fatigue exceeds gains
//
// Source: Israetel/Hoffmann/Smith — Renaissance Periodization, "Training
// Volume Landmarks for Muscle Growth" (2017). Numbers are population
// averages and the user's true landmarks shift over time; treat them as
// guideposts, not gospel.

export interface VolumeLandmarks {
  mv:  number
  mev: number
  mav: { min: number; max: number }
  mrv: number
}

export const VOLUME_LANDMARKS: Record<MuscleGroup, VolumeLandmarks> = {
  chest:      { mv: 8, mev: 10, mav: { min: 12, max: 20 }, mrv: 22 },
  back:       { mv: 8, mev: 10, mav: { min: 14, max: 22 }, mrv: 25 },
  lats:       { mv: 6, mev: 8,  mav: { min: 10, max: 16 }, mrv: 20 },
  shoulders:  { mv: 4, mev: 8,  mav: { min: 12, max: 20 }, mrv: 22 },
  traps:      { mv: 2, mev: 4,  mav: { min: 6,  max: 12 }, mrv: 16 },
  biceps:     { mv: 5, mev: 8,  mav: { min: 14, max: 20 }, mrv: 26 },
  triceps:    { mv: 4, mev: 6,  mav: { min: 10, max: 14 }, mrv: 18 },
  forearms:   { mv: 2, mev: 4,  mav: { min: 6,  max: 10 }, mrv: 14 },
  quads:      { mv: 6, mev: 8,  mav: { min: 12, max: 18 }, mrv: 20 },
  hamstrings: { mv: 3, mev: 6,  mav: { min: 10, max: 16 }, mrv: 20 },
  glutes:     { mv: 0, mev: 4,  mav: { min: 8,  max: 12 }, mrv: 16 },
  calves:     { mv: 6, mev: 8,  mav: { min: 12, max: 16 }, mrv: 20 },
  core:       { mv: 4, mev: 6,  mav: { min: 8,  max: 16 }, mrv: 25 },
}

// Phase shifts the whole landmark band. In a cut you stay around MV/MEV
// (preservation); in a bulk you can push toward MAV/MRV.
export const PHASE_LANDMARK_MULTIPLIER: Record<TrainingPhase, number> = {
  bulking:     1.0,
  cutting:     0.7,
  maingaining: 0.9,
}

// Intensity-style users (sets close to failure) hit the same biological
// stimulus with fewer sets. Halve the bands — matches the existing
// volume:intensity ratio in WEEKLY_SET_TARGETS.
export const INTENSITY_LANDMARK_MULTIPLIER: Record<TrainingStyle, number> = {
  volume:    1.0,
  intensity: 0.5,
}

export type VolumeStatus =
  | 'below_mv'      // not enough to maintain
  | 'maintenance'   // MV–MEV — holding ground, no growth
  | 'sub_optimal'   // MEV–MAV.min — growing, but not maximally
  | 'optimal'       // within MAV — sweet spot
  | 'high'          // MAV.max–MRV — risky, watch recovery
  | 'over_mrv'      // exceeding recovery capacity

export function getAdjustedLandmarks(
  muscle: MuscleGroup,
  style:  TrainingStyle,
  phase:  TrainingPhase,
): VolumeLandmarks {
  const base = VOLUME_LANDMARKS[muscle]
  const k    = PHASE_LANDMARK_MULTIPLIER[phase] * INTENSITY_LANDMARK_MULTIPLIER[style]
  return {
    mv:  Math.round(base.mv  * k),
    mev: Math.round(base.mev * k),
    mav: {
      min: Math.round(base.mav.min * k),
      max: Math.round(base.mav.max * k),
    },
    mrv: Math.round(base.mrv * k),
  }
}

export function classifyVolumeStatus(sets: number, l: VolumeLandmarks): VolumeStatus {
  if (sets <  l.mv)      return 'below_mv'
  if (sets <  l.mev)     return 'maintenance'
  if (sets <  l.mav.min) return 'sub_optimal'
  if (sets <= l.mav.max) return 'optimal'
  if (sets <= l.mrv)     return 'high'
  return 'over_mrv'
}

// ── Strength Gain Expectations ───────────────────────────────────────────────
//
// Average % gain in composite e1RM (top compound lifts) per week.
//
// Sources synthesised from:
//   • Helms, Morgan, Valdez — "The Muscle and Strength Pyramid" (2nd ed., 2019)
//   • Lyle McDonald — categorisation of trainee classification by rate of gain
//   • Aragon & Schoenfeld 2020 — "Magnitude and Composition of the Energy
//     Surplus for Maximizing Muscle Hypertrophy"
//
// Cuts are expected to *hold* strength, not climb. Slight loss is acceptable
// and even optimal — preserving 95%+ of strength through a cut is a success.

export interface StrengthExpectation {
  /** Lower bound of healthy weekly progress (% per week). May be negative in a cut. */
  minPctPerWeek: number
  /** Upper bound — gains beyond this are usually water/technique, not load. */
  maxPctPerWeek: number
}

export const STRENGTH_GAIN_EXPECTATIONS: Record<ExperienceLevel, Record<TrainingPhase, StrengthExpectation>> = {
  beginner: {
    bulking:     { minPctPerWeek:  0.75, maxPctPerWeek: 1.5  },
    cutting:     { minPctPerWeek: -0.5,  maxPctPerWeek: 0.5  },
    maingaining: { minPctPerWeek:  0.4,  maxPctPerWeek: 0.8  },
  },
  intermediate: {
    bulking:     { minPctPerWeek:  0.25, maxPctPerWeek: 0.5  },
    cutting:     { minPctPerWeek: -0.25, maxPctPerWeek: 0.1  },
    maingaining: { minPctPerWeek:  0.1,  maxPctPerWeek: 0.25 },
  },
  advanced: {
    bulking:     { minPctPerWeek:  0.05, maxPctPerWeek: 0.15 },
    cutting:     { minPctPerWeek: -0.15, maxPctPerWeek: 0.05 },
    maingaining: { minPctPerWeek:  0.02, maxPctPerWeek: 0.1  },
  },
}

export type StrengthTrendStatus = 'below_expected' | 'on_track' | 'above_expected'

export function getStrengthExpectation(
  experience: ExperienceLevel,
  phase:      TrainingPhase,
): StrengthExpectation {
  return STRENGTH_GAIN_EXPECTATIONS[experience][phase]
}

export function classifyStrengthTrend(
  actualPctPerWeek: number,
  exp:              StrengthExpectation,
): StrengthTrendStatus {
  if (actualPctPerWeek < exp.minPctPerWeek) return 'below_expected'
  if (actualPctPerWeek > exp.maxPctPerWeek) return 'above_expected'
  return 'on_track'
}

// ── Phase position helper ────────────────────────────────────────────────────
//
// Weeks elapsed since the user entered their current phase, 1-indexed
// (week 1 = the first week of the phase). Returns null when the profile
// hasn't recorded a phase start. Lives in this file so the dashboard's
// server component can call it from outside JSX without tripping the
// react-hooks/purity rule.

export function getWeeksInPhase(phaseStartedAt: string | null): number | null {
  if (!phaseStartedAt) return null
  const elapsedMs = Date.now() - new Date(phaseStartedAt).getTime()
  return Math.max(1, Math.floor(elapsedMs / (7 * 86400000)) + 1)
}

// ── Linear regression helper (used by Strength Index) ───────────────────────
//
// Least-squares slope of y over weekIndex. Returns slope in y-units per week.
// Returns null when the data is degenerate (n < 3 or all x identical).

export function linearSlopePerWeek(points: { weekStart: string; value: number }[]): number | null {
  if (points.length < 3) return null

  const baseMs = new Date(points[0].weekStart).getTime()
  const xs = points.map(p => (new Date(p.weekStart).getTime() - baseMs) / (7 * 86400000))
  const ys = points.map(p => p.value)
  const n  = points.length

  const meanX = xs.reduce((s, x) => s + x, 0) / n
  const meanY = ys.reduce((s, y) => s + y, 0) / n

  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  if (den === 0) return null
  return num / den
}

// ── Mesocycle timeline ───────────────────────────────────────────────────────
//
// A small calendar-shaped strip of week cells representing where the user
// sits in their current training block. Used by both the dashboard
// PhaseCoachCard (compact) and the /progress PhaseCoachDetail (full).
//
// Cell statuses are derived from the same WeekSummary data used elsewhere —
// no new DB queries needed.

export type MesocycleCellStatus =
  | 'good'     // hit weekly goal
  | 'low'      // trained but under goal
  | 'missed'   // zero sessions
  | 'current'  // ongoing — partial data
  | 'pending'  // future week
  | 'deload'   // recommended deload week (overrides above on the cell)

export interface MesocycleCell {
  weekNumber:   number   // 1-indexed within the phase
  weekStart:    string   // ISO Monday
  sessionCount: number
  isCurrent:    boolean
  isDeload:     boolean
  status:       MesocycleCellStatus
}

export interface Mesocycle {
  cells:        MesocycleCell[]
  totalWeeks:   number
  deloadWeek:   number   // 1-indexed
  currentWeek:  number   // 1-indexed; clamped to totalWeeks
}

interface BuildMesocycleInput {
  phaseStartedAt:     string | null
  experienceLevel:    ExperienceLevel | null
  trainingPhase:      TrainingPhase   | null
  weeklyData:         { week_start: string; workout_count: number }[]
  weeklyGoalSessions: number
}

function getMondayOf(date: Date): string {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

function addWeeks(iso: string, weeks: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + weeks * 7)
  return d.toISOString().split('T')[0]
}

/**
 * Builds a 1-indexed mesocycle timeline starting from the user's phase start.
 *
 *   - Length = DELOAD_THRESHOLDS for the user's experience × phase, +1 cell
 *     for the deload week itself.
 *   - The deload cell is the last week of the cycle.
 *   - Past weeks are graded against the user's weekly session goal.
 *   - The current week always shows status `current` (partial data).
 *
 * Returns null when phase_started_at is unset — the calling component
 * shouldn't render anything in that case.
 */
export function buildMesocycleTimeline(input: BuildMesocycleInput): Mesocycle | null {
  if (!input.phaseStartedAt) return null

  const experience = input.experienceLevel ?? 'intermediate'
  const phase      = input.trainingPhase   ?? 'maingaining'
  const cycleLen   = DELOAD_THRESHOLDS[experience][phase]   // weeks before deload is due
  const totalWeeks = cycleLen + 1                            // include deload as the last cell
  const deloadWeek = totalWeeks                              // 1-indexed

  const phaseStartMonday = getMondayOf(new Date(input.phaseStartedAt))
  const todayMonday      = getMondayOf(new Date())

  const sessionByWeek = new Map(
    input.weeklyData.map(w => [w.week_start, w.workout_count] as const),
  )

  const cells: MesocycleCell[] = []
  for (let i = 0; i < totalWeeks; i++) {
    const weekStart    = addWeeks(phaseStartMonday, i)
    const sessionCount = sessionByWeek.get(weekStart) ?? 0
    const weekNumber   = i + 1
    const isCurrent    = weekStart === todayMonday
    const isFuture     = weekStart > todayMonday
    const isDeload     = weekNumber === deloadWeek

    let status: MesocycleCellStatus
    if (isDeload && (isCurrent || isFuture)) {
      status = 'deload'
    } else if (isCurrent) {
      status = 'current'
    } else if (isFuture) {
      status = 'pending'
    } else if (sessionCount === 0) {
      status = 'missed'
    } else if (sessionCount >= input.weeklyGoalSessions) {
      status = 'good'
    } else {
      status = 'low'
    }

    cells.push({ weekNumber, weekStart, sessionCount, isCurrent, isDeload, status })
  }

  // Determine current week within the cycle. If today is past the cycle
  // end, clamp to totalWeeks so the UI shows "WK N / N (deload overdue)".
  const currentCellIndex = cells.findIndex(c => c.isCurrent)
  const currentWeek = currentCellIndex >= 0
    ? currentCellIndex + 1
    : todayMonday > cells[cells.length - 1].weekStart
      ? totalWeeks
      : 1

  return { cells, totalWeeks, deloadWeek, currentWeek }
}
