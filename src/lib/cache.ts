/**
 * Centralised caching layer.
 *
 * The strategy:
 *   - unstable_cache (Next.js Data Cache) — persists results across requests.
 *     Cache entries live until explicitly busted via revalidateTag().
 *     revalidate: false means "never expire on a timer — only invalidate on write".
 *
 *   - Tags are per-user so that User A finishing a workout only busts User A's
 *     cached insight data, not every user's.
 *
 *   - Bust helpers are the only place revalidateTag is called.
 *     Action files import and call the appropriate helper instead of
 *     hand-rolling revalidatePath strings.
 */

import { revalidateTag } from 'next/cache'

// ── Tag name generators ────────────────────────────────────────────────────────
// Single source of truth. Use these everywhere — never hand-write tag strings.

export const TAGS = {
  /** Global exercise catalogue (rarely changes). */
  exercises: () => 'exercises',

  /** All workout list/summary data for a user. */
  workouts: (userId: string) => `workouts-${userId}`,

  /** A single workout's detail view. */
  workoutDetail: (workoutId: string) => `workout-${workoutId}`,

  /** All insight cards (streak, weekly summary, neglected muscles, etc.) */
  insights: (userId: string) => `insights-${userId}`,

  /** Personal records. */
  prs: (userId: string) => `prs-${userId}`,

  /** User profile. */
  profile: (userId: string) => `profile-${userId}`,

  /** Routine list. */
  routines: (userId: string) => `routines-${userId}`,

  /** A single routine's detail view. */
  routineDetail: (routineId: string) => `routine-${routineId}`,
} as const

// ── Low-level bust ────────────────────────────────────────────────────────────

function bust(...tags: string[]) {
  // Next.js 16 revalidateTag requires a second `profile` argument.
  // Passing {} (empty CacheLifeConfig) uses runtime defaults.
  tags.forEach(t => revalidateTag(t, {}))
}

// ── Semantic bust helpers ─────────────────────────────────────────────────────
// Call these from server actions — never call revalidateTag directly.

/** After finishing or deleting a workout. */
export function bustAfterWorkout(userId: string) {
  bust(
    TAGS.workouts(userId),
    TAGS.insights(userId),
    TAGS.prs(userId),
  )
}

/** After editing a specific workout's meta or sets. */
export function bustWorkoutDetail(userId: string, workoutId: string) {
  bust(
    TAGS.workouts(userId),
    TAGS.workoutDetail(workoutId),
    TAGS.insights(userId),
    TAGS.prs(userId),
  )
}

/** After creating / updating / deleting a routine. */
export function bustRoutines(userId: string, routineId?: string) {
  bust(TAGS.routines(userId))
  if (routineId) bust(TAGS.routineDetail(routineId))
}

/** After updating the user profile. */
export function bustProfile(userId: string) {
  bust(TAGS.profile(userId))
}

/** After importing workouts (exercise list may have grown). */
export function bustAfterImport(userId: string) {
  bust(
    TAGS.workouts(userId),
    TAGS.insights(userId),
    TAGS.prs(userId),
    TAGS.exercises(),
  )
}

/** After updating an exercise's muscle group / movement pattern. */
export function bustExercises() {
  bust(TAGS.exercises())
}

/** After clearing all workout data. */
export function bustEverything(userId: string) {
  bust(
    TAGS.workouts(userId),
    TAGS.insights(userId),
    TAGS.prs(userId),
    TAGS.profile(userId),
    TAGS.routines(userId),
    TAGS.exercises(),
  )
}
