import { cache } from 'react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import { buildTrainingCycle, resolveCycleAnchor, type TrainingCycle } from '@/lib/training-cycle'
import type { ExperienceLevel, TrainingPhase } from '@/types/database'

// Newest workouts first, capped: a very long phase drops its oldest weeks
// rather than its newest (PostgREST caps responses at ~1000 rows anyway).
const MAX_WORKOUT_ROWS = 1000

const EXPERIENCE_LEVELS: readonly ExperienceLevel[] = ['beginner', 'intermediate', 'advanced']
const TRAINING_PHASES: readonly TrainingPhase[] = ['bulking', 'cutting', 'maingaining']

// The columns are text with check constraints; narrow without casting.
function toExperienceLevel(value: string | null | undefined): ExperienceLevel | null {
  return EXPERIENCE_LEVELS.find(level => level === value) ?? null
}

function toTrainingPhase(value: string | null | undefined): TrainingPhase | null {
  return TRAINING_PHASES.find(phase => phase === value) ?? null
}

export function toWorkoutDates(rows: { started_at: string | null }[]): string[] {
  return rows.flatMap(row => (row.started_at ? [row.started_at] : []))
}

function earliest(...dates: (string | null)[]): string | null {
  const present = dates.filter((date): date is string => date !== null)
  if (present.length === 0) return null
  return present.reduce((a, b) => (new Date(a) < new Date(b) ? a : b))
}

type ServerClient = Awaited<ReturnType<typeof getSupabaseServer>>

// Only for lifters with no cycle or phase start (e.g. no profile row yet).
async function getFirstWorkoutAt(supabase: ServerClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select('started_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new DatabaseError(`Failed to fetch first workout: ${error.message}`, error)
  return data?.started_at ?? null
}

export const getTrainingCycle = cache(async (userId: string, at?: string): Promise<TrainingCycle> => {
  const supabase = await getSupabaseServer()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('weekly_goal_sessions, cycle_started_at, phase_started_at, break_prompt_dismissed_at, experience_level, training_phase')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) throw new DatabaseError(`Failed to fetch training cycle profile: ${profileError.message}`, profileError)

  const phaseStartedAt = profile?.phase_started_at ?? null
  let cycleStartedAt = profile?.cycle_started_at ?? null
  if (!cycleStartedAt && !phaseStartedAt) {
    cycleStartedAt = resolveCycleAnchor(null, null, await getFirstWorkoutAt(supabase, userId))
  }
  const since = earliest(cycleStartedAt, phaseStartedAt)

  let completedWorkoutDates: string[] = []
  if (since) {
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('started_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(MAX_WORKOUT_ROWS)

    if (error) throw new DatabaseError(`Failed to fetch workouts for training cycle: ${error.message}`, error)
    completedWorkoutDates = toWorkoutDates(workouts ?? [])
  }

  return buildTrainingCycle({
    completedWorkoutDates,
    weeklyGoal: profile?.weekly_goal_sessions ?? 3,
    cycleStartedAt,
    phaseStartedAt,
    breakPromptDismissedAt: profile?.break_prompt_dismissed_at ?? null,
    experienceLevel: toExperienceLevel(profile?.experience_level),
    trainingPhase: toTrainingPhase(profile?.training_phase),
    now: at ? new Date(at) : new Date(),
  })
})
