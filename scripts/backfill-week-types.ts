// One-off: fills workouts.week_type / is_deload for completed workouts saved
// before set-suggestions v2. Needs the 20261126120000 migration applied first.
//
//   npx tsx scripts/backfill-week-types.ts --dry-run   # counts only, no writes
//   npx tsx scripts/backfill-week-types.ts             # writes
//
// (tsx, not ts-node: the lib code imports through the "@/" path alias.)
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'
import { z } from 'zod'
import { weekTypeAt, type BackfillProfile, type WeekTypeResult } from '@/lib/week-type-backfill'

dotenv.config({ path: join(__dirname, '../.env.local') })

const PAGE_SIZE = 1000
const UPDATE_CHUNK_SIZE = 100

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const isDryRun = process.argv.includes('--dry-run')

const ProfileRowSchema = z.object({
  id: z.string(),
  cycle_started_at: z.string().nullable(),
  phase_started_at: z.string().nullable(),
  break_prompt_dismissed_at: z.string().nullable(),
  weekly_goal_sessions: z.number().nullable(),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']).nullable(),
  training_phase: z.enum(['bulking', 'cutting', 'maingaining']).nullable(),
})
type ProfileRow = z.infer<typeof ProfileRowSchema>

const WorkoutRowSchema = z.object({
  id: z.string(),
  started_at: z.string(),
  week_type: z.string().nullable(),
})
type WorkoutRow = z.infer<typeof WorkoutRowSchema>

interface Summary {
  users: number
  updated: number
}

function toBackfillProfile(row: ProfileRow): BackfillProfile {
  return {
    cycleStartedAt: row.cycle_started_at,
    phaseStartedAt: row.phase_started_at,
    breakPromptDismissedAt: row.break_prompt_dismissed_at,
    weeklyGoalSessions: row.weekly_goal_sessions,
    experienceLevel: row.experience_level,
    trainingPhase: row.training_phase,
  }
}

async function fetchProfilePage(client: SupabaseClient, from: number): Promise<ProfileRow[]> {
  const { data, error } = await client
    .from('profiles')
    .select('id, cycle_started_at, phase_started_at, break_prompt_dismissed_at, weekly_goal_sessions, experience_level, training_phase')
    .order('id', { ascending: true })
    .range(from, from + PAGE_SIZE - 1)
  if (error) throw new Error(`Failed to fetch profiles: ${error.message}`)
  return z.array(ProfileRowSchema).parse(data)
}

async function fetchWorkoutPage(client: SupabaseClient, userId: string, from: number): Promise<WorkoutRow[]> {
  const { data, error } = await client
    .from('workouts')
    .select('id, started_at, week_type')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: true })
    .range(from, from + PAGE_SIZE - 1)
  if (error) throw new Error(`Failed to fetch workouts for ${userId}: ${error.message}`)
  return z.array(WorkoutRowSchema).parse(data)
}

async function fetchAllPages<T>(fetchPage: (from: number) => Promise<T[]>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await fetchPage(from)
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}

function groupByResult(
  targets: WorkoutRow[], results: WeekTypeResult[],
): Map<string, { result: WeekTypeResult; ids: string[] }> {
  const groups = new Map<string, { result: WeekTypeResult; ids: string[] }>()
  targets.forEach((workout, index) => {
    const result = results[index]
    const key = `${result.weekType}:${result.isDeload}`
    const group = groups.get(key) ?? { result, ids: [] }
    group.ids.push(workout.id)
    groups.set(key, group)
  })
  return groups
}

async function updateChunk(userId: string, ids: string[], result: WeekTypeResult): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .update({ week_type: result.weekType, is_deload: result.isDeload })
    .eq('user_id', userId)
    .in('id', ids)
  if (error) throw new Error(`Failed to update workouts for ${userId}: ${error.message}`)
}

async function writeResults(userId: string, targets: WorkoutRow[], results: WeekTypeResult[]): Promise<void> {
  for (const { result, ids } of groupByResult(targets, results).values()) {
    for (let start = 0; start < ids.length; start += UPDATE_CHUNK_SIZE) {
      await updateChunk(userId, ids.slice(start, start + UPDATE_CHUNK_SIZE), result)
    }
  }
}

async function backfillUser(profileRow: ProfileRow): Promise<number> {
  const userId = profileRow.id
  const workouts = await fetchAllPages(from => fetchWorkoutPage(supabase, userId, from))
  const targets = workouts.filter(workout => workout.week_type === null)
  if (targets.length === 0) return 0

  const profile = toBackfillProfile(profileRow)
  const dates = workouts.map(workout => workout.started_at)
  const results = targets.map(workout => weekTypeAt(profile, dates, workout.started_at))

  if (!isDryRun) await writeResults(userId, targets, results)
  console.log(`${userId}: ${targets.length} workout(s) ${isDryRun ? 'would be updated' : 'updated'}`)
  return targets.length
}

async function run(): Promise<Summary> {
  const profiles = await fetchAllPages(from => fetchProfilePage(supabase, from))
  const summary: Summary = { users: profiles.length, updated: 0 }
  for (const profile of profiles) {
    summary.updated += await backfillUser(profile)
  }
  return summary
}

run()
  .then(summary => {
    const verb = isDryRun ? 'would update' : 'updated'
    console.log(`\nDone${isDryRun ? ' (dry run, nothing written)' : ''}: ${summary.users} user(s) scanned, ${verb} ${summary.updated} workout(s).`)
  })
  .catch((error: unknown) => {
    console.error('\nBackfill failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
