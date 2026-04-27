'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { DatabaseError } from '@/lib/errors'
import { revalidateAll } from '@/lib/cache'
import type { MuscleGroup, MovementPattern } from '@/types/database'

interface UpdateExerciseMetaParams {
  muscle_group?: MuscleGroup
  movement_pattern?: MovementPattern
}

export async function updateExerciseAction(
  id: string,
  updates: UpdateExerciseMetaParams,
): Promise<{ success: true } | { error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  if (!updates.muscle_group && !updates.movement_pattern) {
    return { error: 'No fields to update' }
  }

  const supabase = await getSupabaseServer()

  const { error } = await supabase
    .from('exercises')
    .update(updates)
    .eq('id', id)

  if (error) throw new DatabaseError(`Failed to update exercise: ${error.message}`, error)

  revalidateAll()

  return { success: true }
}
