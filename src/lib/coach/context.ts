import { getProfile } from '@/lib/data/profile'
import {
  getWeeklyTrainingSummary,
  getRecentPRs,
  getNeglectedMuscles,
  getStalledMovements,
  getWeeklySetsByMuscle,
  getPushPullBalance,
  getTrainingStreak,
} from '@/lib/data/insights'
import { getRecentReadinessLogs } from '@/lib/data/readiness'
import { getRoutines } from '@/lib/data/routines'
import { assessFatigueLevel } from '@/lib/algorithms'
import { WUP_CYCLE, type WUPScheme } from '@/lib/workout-intelligence'
import { getTrainingCycle } from '@/lib/data/training-cycle'
import { formatSetCount } from '@/lib/muscle-sets'
import type { Profile } from '@/types/database'

// ── Routine-generation keywords: triggers Sonnet + full context ───────────────
const COMPLEX_QUERY_PATTERNS = [
  /\broutine\b/i, /\bprogram\b/i, /\bsplit\b/i, /\bplan\b/i,
  /\bdeload\b/i, /\bmesocycle\b/i, /\bperiodiz/i, /\bschedule\b/i,
  /\bworkout plan\b/i, /\btraining block\b/i,
]

/**
 * Returns true when the user's message requires complex reasoning
 * (routine creation, programming, periodisation). Simple Q&A returns false.
 */
export function isComplexQuery(message: string): boolean {
  return COMPLEX_QUERY_PATTERNS.some(p => p.test(message))
}

/**
 * Builds a structured, compact text context block summarizing the athlete's current state.
 * Fits within ~1,500 tokens and leverages existing cached queries.
 */
export async function buildUserTrainingContext(userId: string): Promise<string> {
  const [
    profile,
    weeklySummaries,
    weeklySets,
    neglectedMuscles,
    stalledMovements,
    recentPRs,
    pushPull,
    streak,
    readinessLogs,
    routines,
    trainingCycle,
  ] = await Promise.all([
    getProfile(userId).catch(() => null),
    getWeeklyTrainingSummary(userId).catch(() => []),
    getWeeklySetsByMuscle(userId).catch(() => []),
    getNeglectedMuscles(userId).catch(() => []),
    getStalledMovements(userId).catch(() => []),
    getRecentPRs(userId, 30).catch(() => []),
    getPushPullBalance(userId).catch(() => ({ pushSets: 0, pullSets: 0, ratio: null })),
    getTrainingStreak(userId).catch(() => ({ currentStreak: 0, longestStreak: 0 })),
    getRecentReadinessLogs(userId, 7).catch(() => []),
    getRoutines(userId).catch(() => []),
    getTrainingCycle(userId).catch(() => null),
  ])

  // Compute fatigue assessment
  const daysSinceLastPR = recentPRs.length > 0 ? recentPRs[0].daysAgo : null
  const fatigue = assessFatigueLevel(
    weeklySummaries,
    daysSinceLastPR,
    profile ? { ...profile, phase_week: trainingCycle?.phaseWeek ?? null } : null,
    readinessLogs,
  )
  const wupScheme = trainingCycle?.scheme ?? WUP_CYCLE[0]
  const weeksInPhase = profile?.phase_started_at && trainingCycle ? trainingCycle.phaseWeek : null

  return [
    formatProfileSection(profile, weeksInPhase),
    formatPeriodizationSection(wupScheme),
    trainingCycle ? formatCycleSection(trainingCycle, fatigue) : '',
    formatWeeklyVolumeSection(weeklySets, pushPull, streak),
    formatRecoverySection(fatigue, readinessLogs),
    formatProgressAndStallsSection(recentPRs, stalledMovements, neglectedMuscles),
    formatRoutinesSection(routines),
  ].filter(Boolean).join('\n\n')
}

// ── Pure formatters ───────────────────────────────────────────────────────────

function formatProfileSection(profile: Profile | null, weeksInPhase: number | null): string {
  if (!profile) return '### ATHLETE PROFILE\nAnonymous Athlete (Profile not configured yet)'

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Athlete'
  const goal = profile.training_goal ?? 'general hypertrophy'
  const phase = profile.training_phase ?? 'maingaining'
  const style = profile.training_style ?? 'volume'
  const level = profile.experience_level ?? 'intermediate'
  const phaseDuration = weeksInPhase ? `(Week ${weeksInPhase} of current phase)` : ''

  const stats = [
    profile.height_cm ? `${profile.height_cm}cm` : null,
    profile.age_years ? `${profile.age_years}yo` : null,
    profile.sex ? profile.sex : null,
    profile.weekly_goal_sessions ? `Goal: ${profile.weekly_goal_sessions} sessions/wk` : null,
  ].filter(Boolean).join(' | ')

  return `### ATHLETE PROFILE
- Name: ${name}
- Level: ${level} | Goal: ${goal} | Style: ${style}
- Phase: ${phase} ${phaseDuration}
${stats ? `- Bio: ${stats}` : ''}`
}

// The logger deloads automatically in a deload week, so the coach needs to know
// whether this is one before it advises on volume or progression.
export function formatCycleSection(
  cycle: { isDeloadWeek: boolean; phaseWeek: number },
  fatigue: { shouldSuggest: boolean; score: number } | null,
): string {
  const lines = [
    '### TRAINING CYCLE',
    `- Deload week: ${cycle.isDeloadWeek ? 'yes' : 'no'}`,
    `- Phase week: ${cycle.phaseWeek}`,
  ]
  if (fatigue) {
    lines.push(`- Fatigue: ${fatigue.shouldSuggest ? 'deload suggested' : 'no deload needed'} (score ${fatigue.score}/6)`)
  }
  return lines.join('\n')
}

function formatPeriodizationSection(wupScheme: WUPScheme): string {
  return `### CURRENT PERIODIZATION (Weekly Undulating Periodization - WUP)
- Cycle: ${wupScheme.label}
- Target Rep Range: ${wupScheme.repRange.min}–${wupScheme.repRange.max} reps
- Target RPE: ${wupScheme.rpeTarget}
- Focus: ${wupScheme.rationale}`
}

function formatWeeklyVolumeSection(
  weeklySets: Array<{ muscleGroup: string; setCount: number }>,
  pushPull: { pushSets: number; pullSets: number; ratio: number | null },
  streak: { currentStreak: number; longestStreak: number }
): string {
  const setsSummary = weeklySets.length > 0
    ? weeklySets.map(s => `${s.muscleGroup}: ${formatSetCount(s.setCount)} sets`).join(', ')
    : 'No sets logged yet this week'

  const ratioSummary = pushPull.ratio != null
    ? `${pushPull.ratio.toFixed(2)}:1 (${pushPull.pushSets} push / ${pushPull.pullSets} pull)`
    : 'No upper body volume logged in last 28 days'

  return `### TRAINING VOLUME & BALANCE
- Sets This Week (Mon-Sun): ${setsSummary}
- Push:Pull 28-Day Ratio: ${ratioSummary}
- Consistency Streak: ${streak.currentStreak} weeks active (Longest: ${streak.longestStreak} weeks)`
}

function formatRecoverySection(
  fatigue: ReturnType<typeof assessFatigueLevel>,
  readinessLogs: Array<{ sleep_score: number; soreness_score: number; energy_score: number }>
): string {
  const fatigueSignals = fatigue.signals.length > 0
    ? fatigue.signals.join('; ')
    : 'No significant systemic fatigue indicators'

  const readinessSummary = readinessLogs.length > 0
    ? `${readinessLogs.length} entries in last 7 days (latest Sleep: ${readinessLogs[0].sleep_score}/5, Energy: ${readinessLogs[0].energy_score}/5, Soreness: ${readinessLogs[0].soreness_score}/5)`
    : 'No readiness entries logged recently'

  return `### RECOVERY & FATIGUE
- Fatigue Assessment: Score ${fatigue.score}/6 (Deload Suggested: ${fatigue.shouldSuggest ? 'YES' : 'NO'}, Confidence: ${fatigue.confidence})
- Signals: ${fatigueSignals}
- Subjective Readiness: ${readinessSummary}`
}

function formatProgressAndStallsSection(
  recentPRs: Array<{ exerciseName: string; value: number; daysAgo: number }>,
  stalled: Array<{ exerciseName: string; currentBest: number; pctPerWeek: number; advice: string[] }>,
  neglected: Array<{ muscleGroup: string; daysSinceLastTrained: number }>
): string {
  const prs = recentPRs.length > 0
    ? recentPRs.slice(0, 3).map(p => `${p.exerciseName} (${p.value}kg, ${p.daysAgo}d ago)`).join(', ')
    : 'None in the past 30 days'

  const stalls = stalled.length > 0
    ? stalled.map(s => `${s.exerciseName} (stuck at ${s.currentBest}kg, rate: ${s.pctPerWeek}%/wk)`).join(', ')
    : 'No stalled compound lifts detected'

  const neg = neglected.length > 0
    ? neglected.slice(0, 4).map(m => `${m.muscleGroup} (${m.daysSinceLastTrained}d ago)`).join(', ')
    : 'All primary muscle groups trained recently'

  return `### PERFORMANCE SIGNALS
- Recent PRs: ${prs}
- Stalled Lifts: ${stalls}
- Neglected Muscles: ${neg}`
}

function formatRoutinesSection(routines: Array<{ title: string; routine_exercises?: Array<unknown> }>): string {
  if (routines.length === 0) return '### EXISTING ROUTINES\nUser currently has no saved routines.'

  const list = routines.slice(0, 5).map(r => {
    const count = r.routine_exercises?.length ?? 0
    return `- "${r.title}" (${count} exercises)`
  }).join('\n')

  return `### EXISTING ROUTINES\n${list}`
}

/**
 * A lightweight (~500 token) context snapshot for quick Q&A that doesn't
 * require full training history. Omits the routines section and trims volume
 * data to the 3 most relevant signals. Used with the Haiku model.
 */
export async function buildCompactContext(userId: string): Promise<string> {
  const [
    profile,
    stalledMovements,
    neglectedMuscles,
    recentPRs,
    trainingCycle,
  ] = await Promise.all([
    getProfile(userId).catch(() => null),
    getStalledMovements(userId).catch(() => []),
    getNeglectedMuscles(userId).catch(() => []),
    getRecentPRs(userId, 14).catch(() => []),
    getTrainingCycle(userId).catch(() => null),
  ])

  const weeksInPhase = profile?.phase_started_at && trainingCycle ? trainingCycle.phaseWeek : null

  const lines: string[] = [
    formatProfileSection(profile, weeksInPhase),
  ]

  if (trainingCycle) lines.push(formatCycleSection(trainingCycle, null))

  if (stalledMovements.length > 0) {
    const stalls = stalledMovements.slice(0, 2).map(s =>
      `${s.exerciseName} (stuck at ${s.currentBest}kg)`
    ).join(', ')
    lines.push(`### KEY SIGNALS\n- Stalled Lifts: ${stalls}`)
  }

  if (neglectedMuscles.length > 0) {
    const neglected = neglectedMuscles.slice(0, 2).map(m =>
      `${m.muscleGroup} (${m.daysSinceLastTrained}d ago)`
    ).join(', ')
    lines.push(`- Neglected Muscles: ${neglected}`)
  }

  if (recentPRs.length > 0) {
    const prs = recentPRs.slice(0, 2).map(p => `${p.exerciseName} (${p.value}kg)`).join(', ')
    lines.push(`- Recent PRs: ${prs}`)
  }

  return lines.join('\n\n')
}
