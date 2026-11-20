// What Home says, decided in one place: the readiness number, the one coach
// note worth showing, and the latest thing worth celebrating.

import type { PRType } from '@/types/database'
import type { RecentPR } from '@/lib/data/insights'

const HIGHLIGHT_PR_DAYS = 7

// ─── Readiness ───────────────────────────────────────────────────────────────

export type ReadinessWord = 'Good' | 'Fair' | 'Low'

export interface ReadinessSummary {
  score: number
  word: ReadinessWord
  tone: 'positive' | 'caution' | 'negative'
}

interface ReadinessLog {
  sleep_score: number
  soreness_score: number
  energy_score: number
}

// The check-in is three 1–5 answers; map their average onto 0–100.
export function readinessSummary(log: ReadinessLog | null): ReadinessSummary | null {
  if (!log) return null
  const average = (log.sleep_score + log.soreness_score + log.energy_score) / 3
  const score = Math.round(((average - 1) / 4) * 100)
  if (score >= 75) return { score, word: 'Good', tone: 'positive' }
  if (score >= 50) return { score, word: 'Fair', tone: 'caution' }
  return { score, word: 'Low', tone: 'negative' }
}

// ─── Coach note ──────────────────────────────────────────────────────────────

export type CoachNoteKind =
  | 'long_break'
  | 'deload'
  | 'phase_transition'
  | 'dissociation'
  | 'stalled_lift'
  | 'neglected_muscle'

export interface CoachSignalsInput {
  offerRestart: boolean
  missedWeeks: number
  shouldDeload: boolean
  deloadReason: string | null
  phaseTransitionDue: boolean
  dissociation: { hasDissociation: boolean; message: string | null }
  stalledLift: { exerciseName: string; pctPerWeek: number } | null
  neglectedMuscle: { muscleGroup: string; daysSinceLastTrained: number } | null
}

export interface CoachNote {
  kind: CoachNoteKind
  title: string
  body: string
  href: string
  cta: string
}

// Missed weeks are weeks under half the goal, not necessarily time away.
export function longBreakTitle(missedWeeks: number): string {
  return `${missedWeeks} light weeks in a row`
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

type NoteRule = (input: CoachSignalsInput) => CoachNote | null

// Highest priority first. Home shows only the first rule that fires.
const NOTE_RULES: NoteRule[] = [
  input => input.offerRestart ? {
    kind: 'long_break',
    title: longBreakTitle(input.missedWeeks),
    body: 'Restart your phase from week 1 so deloads and targets fit where you are now.',
    href: '/account',
    cta: 'Restart',
  } : null,
  input => input.shouldDeload ? {
    kind: 'deload',
    title: 'Time for a lighter week',
    body: input.deloadReason ?? 'Your recent training points to a deload.',
    href: '/progress#coaching',
    cta: 'Why',
  } : null,
  input => input.phaseTransitionDue ? {
    kind: 'phase_transition',
    title: 'Your phase is complete',
    body: 'You have finished this block. Pick what comes next.',
    href: '/account',
    cta: 'Change phase',
  } : null,
  input => input.dissociation.hasDissociation ? {
    kind: 'dissociation',
    title: 'Size up, strength flat',
    body: input.dissociation.message ?? 'Bodyweight is rising faster than your lifts.',
    href: '/progress#coaching',
    cta: 'Details',
  } : null,
  input => input.stalledLift ? {
    kind: 'stalled_lift',
    title: `${input.stalledLift.exerciseName} has stalled`,
    body: 'No real progress for three weeks. A variation can restart it.',
    href: '/exercises',
    cta: 'See options',
  } : null,
  input => input.neglectedMuscle ? {
    kind: 'neglected_muscle',
    title: `${capitalise(input.neglectedMuscle.muscleGroup)} — ${input.neglectedMuscle.daysSinceLastTrained} days since you trained it`,
    body: 'Fit it into your next session.',
    href: '/routines',
    cta: 'Pick a routine',
  } : null,
]

export function pickCoachNote(input: CoachSignalsInput): CoachNote | null {
  for (const rule of NOTE_RULES) {
    const note = rule(input)
    if (note) return note
  }
  return null
}

// ─── Latest highlight ────────────────────────────────────────────────────────

export interface HighlightWorkout {
  id: string
  title: string
  startedAt: string
  durationSeconds: number | null
  volumeKg: number
}

export type Highlight =
  | { kind: 'pr'; exerciseName: string; value: number; prType: PRType; daysAgo: number }
  | ({ kind: 'workout' } & HighlightWorkout)

export function pickHighlight(prs: RecentPR[], lastWorkout: HighlightWorkout | null): Highlight | null {
  const newestPR = prs
    .filter(pr => pr.daysAgo <= HIGHLIGHT_PR_DAYS)
    .sort((a, b) => a.daysAgo - b.daysAgo)[0]
  if (newestPR) {
    return { kind: 'pr', exerciseName: newestPR.exerciseName, value: newestPR.value, prType: newestPR.prType, daysAgo: newestPR.daysAgo }
  }
  return lastWorkout ? { kind: 'workout', ...lastWorkout } : null
}

// ─── Small formatters ────────────────────────────────────────────────────────

export function weekLabel(scheme: { label: string } | null, isDeloadWeek: boolean): string | null {
  if (isDeloadWeek) return 'Deload week'
  if (!scheme) return null
  return capitalise(scheme.label.toLowerCase())
}

export function tonnes(kg: number): string {
  return (kg / 1000).toFixed(1)
}
