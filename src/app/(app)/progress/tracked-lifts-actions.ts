'use server'

import { requireAuth } from '@/lib/auth'
import { revalidateAll } from '@/lib/cache'
import { getSupabaseServer } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import { TrackedLiftIdsSchema } from './tracked-lifts-schemas'

type ActionResult = { success: true } | { success: false; error: string }

// Saves the lifter's picks, in order. An empty list returns to "my most-trained lifts".
export async function saveTrackedLiftsAction(exerciseIds: string[]): Promise<ActionResult> {
  try {
    await requireAuth()
    const ids = TrackedLiftIdsSchema.parse(exerciseIds)
    const supabase = await getSupabaseServer()
    const { error } = await supabase.rpc('save_tracked_lifts', { p_exercise_ids: ids })
    if (error) throw new DatabaseError(`Failed to save your lifts: ${error.message}`, error)
    revalidateAll()
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Couldn\u2019t save your lifts. Try again.' }
  }
}
